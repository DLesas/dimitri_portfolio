// Each section fades in, then its parts rise in 100ms apart (see `enter` in
// src/styles/entrance.css). In its own module so the server-rendered page and the client
// SkillsSection can both import it (a client module's exports reach the server only as
// component references).
export const fadeInUp = "enter enter-duration-600 [--enter-y:30px]";
