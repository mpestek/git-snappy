#! /usr/bin/env node

const { program } = require('commander');
const conf = new (require('conf'))();
const chalk = require('chalk');
const { exec } = require('child_process');

// conf.path = process.cwd() + '/.git-snappy.json';
const mainPath = 'C:\\Users\\Mesud\\Desktop\\VT\\repos';
conf.path = mainPath + '\\.git-snappy.json';

function executeCommand(command) {
	return new Promise((resolve, reject) => {
		exec(command, (error, result, stderr) => {
			if (error) {
				console.log(`error: ${error.message}`);
				reject(error.message);
			}
			if (stderr) {
				console.log(`stderr: ${stderr}`);
				reject(stderr);
			}

			resolve(result);
		});
	});
}

/**
 * LIST ALL SNAPSHOTS
 */
program
  .command('list')
  .description('List all snapshots')
  .action(() => {
    console.log(chalk.greenBright.bold('Snapshots:'));
		Object.keys(conf.get('snapshots', {}))
			.forEach(snapshot => console.log(chalk.greenBright(`- ${snapshot}`)));
  });

/**
 * SHOW SNAPSHOT DETAILS
 */
program
  .command('show <snapshot>')
  .description('Show snapshot details')
  .action(snapshot => {
		const snapshots = conf.get('snapshots', {});

		if (!snapshots[snapshot]) {
			console.log(chalk.red('Snapshot does not exist'));
		}

		console.log(chalk.greenBright.bold(`Snapshot: ${snapshot}`));
		console.log(chalk.greenBright(JSON.stringify(snapshots[snapshot], 0, 2)));
  });

/**
 * REMOVE A SNAPSHOT
 */
program
.command('remove <snapshot>')
.description('Remove a snapshots')
.action(snapshot => {
	const snapshots = conf.get('snapshots', {});

	if (!snapshots[snapshot]) {
		console.log(chalk.red('Snapshot does not exist'));
		return;
	}

	delete snapshots[snapshot];
	conf.set('snapshots', snapshots);
	console.log(chalk.greenBright(`Snapshot ${snapshot} removed`));
});

/**
 * CREATE SNAPSHOT
 */
program
  .command('create <snapshot>')
  .description('Create a snapshot')
  .action(snapshot => {
    const snapshots = conf.get('snapshots', {});

		if (snapshots[snapshot]) {
			console.log(chalk.red('Snapshot already exists'));
			return;
		}

		snapshots[snapshot] = {};

    exec(`ls ${mainPath}`, (error, folders, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }

			const GET_BRANCH_NAME_COMMAND = 'git rev-parse --abbrev-ref HEAD';
			const folderNames = folders.split('\n').filter((folderName) => folderName?.length > 0);

			const promises = [];
			folderNames.forEach((folderName) => {
				promises.push(
					executeCommand(`cd "${mainPath}\\${folderName}" && git add . && (git diff --quiet && git diff --staged --quiet || git commit -m "[[SNAPPY]] Unfinished")`)
						.then(() =>
							executeCommand(`cd "${mainPath}\\${folderName}" && ${GET_BRANCH_NAME_COMMAND}`)
								.then(branchName => {
									console.log(`${folderName} - ${branchName}`);
									branchName = branchName.slice(0, branchName.indexOf('\n'));
									snapshots[snapshot] = {
										...snapshots[snapshot],
										[folderName]: branchName
									}
								})
						)
						.catch(err => console.error(err))
				);
			});

			Promise.all(promises).then(() => conf.set('snapshots', snapshots));
		});
  });

/**
 * CHECKOUT SNAPSHOT
 */
program
  .command('checkout <snapshot>')
  .description('Checkout a snapshot')
  .action(snapshot => {
    const snapshots = conf.get('snapshots', {});

		if (!snapshots[snapshot]) {
			console.log(chalk.red('Snapshot does not exist'));
			return;
		}

    exec(`ls ${mainPath}`, (error, folders, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }

			const folderNames = folders.split('\n').filter((folderName) => folderName?.length > 0);

			const promises = [];
			folderNames.forEach((folderName) => {
				promises.push(
					executeCommand(`cd "${mainPath}\\${folderName}" && git checkout ${snapshots[snapshot][folderName]}`)
				);
			});

			Promise.all(promises).then(() => conf.set('snapshots', snapshots)).catch(err => console.log(err));
		});
  });

program.parse();
