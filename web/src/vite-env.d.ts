/// <reference types="vite/client" />

// Declare module for worker imports with ?url suffix
declare module '*?url' {
  const url: string
  export default url
}
