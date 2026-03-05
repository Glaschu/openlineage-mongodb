package com.openlineage.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class OpenLineageServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(OpenLineageServerApplication.class, args);
	}

}
