// Runs once when the server starts: prints the launch checklist in the server log.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { printReadiness } = await import("./lib/readiness");
  printReadiness();
}
