/**
 * Load the app's own Angular metadata services (crInfo, alignments) at build time.
 *
 * These files are plain IIFEs that register a dependency-free factory on the "app"
 * module, so they can be run in a sandbox with a stub `angular` and the factory called
 * directly. Reading them rather than re-typing their tables means the database can never
 * drift from the definitions the app itself uses.
 */

import fs from "node:fs";
import vm from "node:vm";

export function loadAngularService(file, serviceName) {
	const registered = {};
	const moduleApi = {};
	for (const method of ["service", "factory"]) {
		moduleApi[method] = (name, fn) => { registered[name] = fn; return moduleApi; };
	}
	for (const method of ["constant", "value"]) {
		moduleApi[method] = (name, val) => { registered[name] = () => val; return moduleApi; };
	}
	for (const method of ["controller", "directive", "filter", "config", "run", "provider"]) {
		moduleApi[method] = () => moduleApi;
	}

	const sandbox = { angular: { module: () => moduleApi }, console, Math };
	vm.createContext(sandbox);
	vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });

	const factory = registered[serviceName];
	if (!factory) {
		throw new Error(`${file} did not register a service named ${JSON.stringify(serviceName)}`);
	}
	if (factory.$inject && factory.$inject.length) {
		throw new Error(`${serviceName} now has dependencies (${factory.$inject.join(", ")}) ` +
			`and can no longer be loaded standalone`);
	}
	return factory();
}
