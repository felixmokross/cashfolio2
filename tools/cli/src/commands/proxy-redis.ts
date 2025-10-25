import { program } from "commander";
import { exec } from "../shared";

program
  .command("proxy-redis")
  .argument("<environment>", "The environment to proxy to, 'prod' or 'staging'")
  .action(async (environment) => {
    console.log(`Proxying to Redis on environment '${environment}'`);

    process.on("SIGINT", () => {
      process.exit(0);
    });

    await exec(`fly proxy 6383:6379 --app ${getRedisAppName(environment)}`);
  });

function getRedisAppName(environment: string) {
  switch (environment) {
    case "prod":
      return "cashfolio-redis";
    case "staging":
      return "cashfolio-redis-staging";
    default:
      throw new Error(
        `Unknown environment '${environment}'. Use 'prod' or 'staging'.`,
      );
  }
}
