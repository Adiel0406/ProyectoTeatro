import { existsSync, readFileSync } from "node:fs";

const expectedNode = "24.22.1";
const expectedNpm = "11.19.1";
const actualNode = process.version.slice(1);
const actualNpm = process.env.npm_config_user_agent?.match(/npm\/([^\s]+)/)?.[1]
  ?? "desconocida";

const errors = [];
if (actualNode !== expectedNode) {
  errors.push(`Node: esperado ${expectedNode}, instalado ${actualNode}`);
}
if (actualNpm !== "desconocida" && actualNpm !== expectedNpm) {
  errors.push(`npm: esperado ${expectedNpm}, instalado ${actualNpm}`);
}
if (!existsSync("package-lock.json")) {
  errors.push("Falta package-lock.json");
}
if (existsSync("package-lock.json")) {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  if (lock.lockfileVersion !== 3) {
    errors.push("package-lock.json no usa lockfileVersion 3");
  }
}
if (!existsSync(".env")) {
  errors.push("Falta .env; copia .env.example antes de iniciar");
}

if (errors.length > 0) {
  console.error("Entorno incompatible:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Entorno verificado: Node ${actualNode}, npm ${actualNpm}`);
}
