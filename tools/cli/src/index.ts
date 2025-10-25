import { program } from "commander";
import "dotenv/config";
import "./commands";

program.name("cli");

program.parse();
