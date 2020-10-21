const { exec } = require("child_process");
const https = require("https");
const { readFileSync } = require("fs");
const { URCLASS_URL, URCLASS_KEY, ASSESSMENT_ID, TRAVIS_PULL_REQUEST_SLUG } = process.env;

if (URCLASS_KEY === "\n") {
  throw new Error("urclass key is missing");
}

if (TRAVIS_PULL_REQUEST_SLUG === "\n") {
  throw new Error("github username is missing");
}

exec("npx lerna run report", (err, stdout, stderr) => {
  let resultServer = readFileSync("./packages/server/report.json").toString();
  let resultClient = readFileSync("./packages/client/report.json").toString();
  let parsedServer = JSON.parse(resultServer);
  let parsedClient = JSON.parse(resultClient);
  let result = {
    stats: {
      suites: parsedServer.stats.suites + parsedClient.stats.suites,
      tests: parsedServer.stats.tests + parsedClient.stats.tests,
      passes: parsedServer.stats.passes + parsedClient.stats.passes,
      pending: parsedServer.stats.pending + parsedClient.stats.pending,
      failures: parsedServer.stats.failures + parsedClient.stats.failures,
    },
  };
  const username = TRAVIS_PULL_REQUEST_SLUG.split("/")[0];

  const options = {
    hostname: URCLASS_URL,
    path: `/production/submit/sprint`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  console.log(JSON.stringify(options));
  console.log(result);

  const body = {
    assessment_id: ASSESSMENT_ID,
    githubUsername: username,
    type: "mocha",
    result: result,
  };

  makeRequest(options, body);
});

function makeRequest(options, body) {
  const req = https.request(options, (res) => {
    let data;
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      console.log("data from urclass is ", data);
      if (res.statusCode >= 400) {
        if (res.statusCode === 400) {
          throw new Error("invalid github username.");
        }
        throw new Error("There is an error on response from urclass.");
      }
    });
  });

  req.on("error", (e) => {
    console.log(e);
    throw new Error("data did not send to urclass");
  });

  req.write(JSON.stringify(body));
  req.end();
}
