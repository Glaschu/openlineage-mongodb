import ssl
import socket
import subprocess
import tempfile
import sys
import os
import argparse

def convert_jks_to_pem(jks_path, jks_password, pem_path):
    """
    Python's ssl module doesn't parse JKS natively.
    This uses keytool and openssl to convert the JKS to PEM.
    """
    print(f"[*] Converting {jks_path} to temporary PEM format...")
    p12_path = pem_path + ".p12"
    
    # 1. JKS to PKCS12 using keytool
    cmd1 = [
        "keytool", "-importkeystore",
        "-srckeystore", jks_path,
        "-destkeystore", p12_path,
        "-srcstoretype", "jks",
        "-deststoretype", "pkcs12",
        "-srcstorepass", jks_password,
        "-deststorepass", jks_password,
        "-noprompt"
    ]
    try:
        subprocess.run(cmd1, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"[!] keytool failed: {e.stderr.decode().strip()}")
        sys.exit(1)
    
    # 2. PKCS12 to PEM using openssl
    cmd2 = [
        "openssl", "pkcs12",
        "-in", p12_path,
        "-out", pem_path,
        "-passin", f"pass:{jks_password}",
        "-passout", f"pass:{jks_password}",
        "-nokeys"
    ]
    try:
        subprocess.run(cmd2, check=True, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError as e:
        print(f"[!] openssl failed. Could not convert p12 to pem.")
        if os.path.exists(p12_path): os.remove(p12_path)
        sys.exit(1)
        
    # Clean up intermediate p12 file
    if os.path.exists(p12_path):
        os.remove(p12_path)
    
    print(f"[*] Successfully converted truststore for testing.")

def test_tls_connection(host, port, pem_path):
    print(f"[*] Testing TLS connection to {host}:{port}...")
    
    # Load the PEM as the Trusted CA for the connection
    context = ssl.create_default_context(cafile=pem_path)
    context.verify_mode = ssl.CERT_REQUIRED
    
    try:
        with socket.create_connection((host, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                print(f"\n[+] SUCCESS! Established verified TLS connection to {host}:{port}")
                print(f"    - TLS Version: {ssock.version()}")
                print(f"    - Cipher: {ssock.cipher()[0]}")
                cert = ssock.getpeercert()
                
                # Make the subject readable
                subject = dict(x[0] for x in cert.get('subject', []))
                print(f"    - Server Cert Subject: {subject.get('commonName', subject)}")
                return True
                
    except ssl.SSLCertVerificationError as e:
        print(f"\n[-] TLS Verification Failed! The endpoint certificate isn't trusted by the provided JKS.")
        print(f"    Error: {e}")
    except socket.timeout:
        print(f"\n[-] Connection timed out while trying to reach {host}:{port}")
    except Exception as e:
        print(f"\n[-] Failed to connect: {e}")
        
    return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test connecting to a TLS endpoint using a JKS truststore.")
    parser.add_argument("host", help="The endpoint hostname (e.g. cluster.docdb.amazonaws.com)")
    parser.add_argument("port", type=int, help="The endpoint port (e.g. 27017 or 443)")
    parser.add_argument("jks_path", help="Path to your JKS truststore file")
    parser.add_argument("jks_password", help="Password for the JKS truststore file")
    
    args = parser.parse_args()
    
    # Use a temporary file for the PEM conversion
    with tempfile.NamedTemporaryFile(suffix=".pem", delete=False) as temp_pem:
        pem_path = temp_pem.name
        
    try:
        convert_jks_to_pem(args.jks_path, args.jks_password, pem_path)
        test_tls_connection(args.host, args.port, pem_path)
    finally:
        # Always clean up the temporary PEM file out of caution
        if os.path.exists(pem_path):
            os.remove(pem_path)
