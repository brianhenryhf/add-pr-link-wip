const util = require('util');
const core = require('@actions/core');
const github = require('@actions/github');

const supportedEvent = 'pull_request';
const supportedActions = ['opened'];

//configured in workflow file
const linkPattern = core.getInput('link-pattern', { required: true });
//token is NOT magically present in context as some docs seem to indicate - have to supply in workflow yaml to input var
const ghToken = core.getInput('repo-token');

const evthookPayload = github.context.payload;

const octokit = new github.getOctokit(ghToken);

const baseIssuesArgs = {
    owner: (evthookPayload.organization || evthookPayload.repository.owner).login,
    repo: evthookPayload.repository.name,
    issue_number: evthookPayload.pull_request.number
};

const addPrComment = async (body) => {
  return octokit.rest.issues.createComment({
      ...baseIssuesArgs,
      body
  });
};

const buildLink = () => {
  return linkPattern.replace(/\{([^}]+)\}/g, (match, p1) => {
    if (p1 === 'pr_number') {
      return evthookPayload.pull_request.number;
    }
  });
}


(async () => {
  try {
    if(!(github.context.eventName === supportedEvent && supportedActions.some(el => el === evthookPayload.action))) {
       core.info(`event/type not supported: ${github.context.eventName.eventName}.${evthookPayload.action}.  skipping action.`);
       return;
    }
    
    const link = buildLink();
    core.debug(`adding pr comment for link ${link}.`);
    await addPrComment(`PR review instance: ${link}`);
    
    core.debug(`done ok.`);
  } catch (error) {
    core.error(util.inspect(error));
    //don't set failure - this shouldn't stop mergability or downstream actions
  }
})();