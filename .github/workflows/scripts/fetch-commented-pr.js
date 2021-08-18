const core = require("@actions/core");
const { GitHub, context } = require("@actions/github");

const github = new GitHub(process.env.GITHUB_TOKEN);

const { data } = await github.pulls.get({
  owner: context.repo.owner,
  repo: context.repo.repo,
  pull_number: context.number(),
});

console.log(`Pull request data `, data);

core.setOutput("pull_request", JSON.stringify(data));
