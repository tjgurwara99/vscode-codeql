import {
  copy,
  readFile,
  mkdirs,
  readdir,
  unlinkSync,
  remove,
  writeFile,
} from "fs-extra";
import { resolve, join } from "path";

export interface DeployedPackage {
  distPath: string;
  name: string;
  version: string;
}

const packageFiles = [
  ".vscodeignore",
  "CHANGELOG.md",
  "README.md",
  "language-configuration.json",
  "snippets.json",
  "media",
  "out",
  "databases-schema.json",
];

async function copyDirectory(
  sourcePath: string,
  destPath: string,
): Promise<void> {
  console.log(`copying ${sourcePath} to ${destPath}`);
  await copy(sourcePath, destPath);
}

async function copyPackage(
  sourcePath: string,
  destPath: string,
): Promise<void> {
  await Promise.all(
    packageFiles.map((file) =>
      copyDirectory(resolve(sourcePath, file), resolve(destPath, file)),
    ),
  );
}

export async function deployPackage(
  packageJsonPath: string,
): Promise<DeployedPackage> {
  try {
    const packageJson: any = JSON.parse(
      await readFile(packageJsonPath, "utf8"),
    );

    // Default to development build; use flag --release to indicate release build.
    const isDevBuild = !process.argv.includes("--release");
    const distDir = join(__dirname, "../../../dist");
    await mkdirs(distDir);

    if (isDevBuild) {
      // NOTE: rootPackage.name had better not have any regex metacharacters
      const oldDevBuildPattern = new RegExp(
        `^${packageJson.name}[^/]+-dev[0-9.]+\\.vsix$`,
      );
      // Dev package filenames are of the form
      //    vscode-codeql-0.0.1-dev.2019.9.27.19.55.20.vsix
      (await readdir(distDir))
        .filter((name) => name.match(oldDevBuildPattern))
        .map((build) => {
          console.log(`Deleting old dev build ${build}...`);
          unlinkSync(join(distDir, build));
        });
      const now = new Date();
      packageJson.version =
        `${packageJson.version}-dev.${now.getUTCFullYear()}.${
          now.getUTCMonth() + 1
        }.${now.getUTCDate()}` +
        `.${now.getUTCHours()}.${now.getUTCMinutes()}.${now.getUTCSeconds()}`;
    }

    const distPath = join(distDir, packageJson.name);
    await remove(distPath);
    await mkdirs(distPath);

    await writeFile(
      join(distPath, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );

    const sourcePath = join(__dirname, "..");
    console.log(
      `Copying package '${packageJson.name}' and its dependencies to '${distPath}'...`,
    );
    await copyPackage(sourcePath, distPath);

    // This is necessary for vsce to know the dependencies
    await copyDirectory(
      resolve(sourcePath, "node_modules"),
      resolve(distPath, "node_modules"),
    );

    return {
      distPath,
      name: packageJson.name,
      version: packageJson.version,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
}
