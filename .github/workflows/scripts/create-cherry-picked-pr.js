const core = require("@actions/core");
const { GitHub, context } = require("@actions/github");

const github = new GitHub(process.env.GITHUB_TOKEN);

const response = await github.pulls.listCommits({
  owner: context.repo.owner,
  repo: context.repo.repo,
  pull_number: context.number(),
});

console.log(response);
