require('dotenv').config();
const cassandra = require('cassandra-driver');

const contactPoints = (process.env.CASSANDRA_CONTACT_POINTS || '10.50.8.60')
  .split(',')
  .map(point => point.trim())
  .filter(Boolean);

const client = new cassandra.Client({
  contactPoints,
  localDataCenter: process.env.CASSANDRA_LOCAL_DC || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'sunbird',
});

let connectPromise;

async function connect() {
  if (!connectPromise) {
    connectPromise = client.connect();
  }
  await connectPromise;
  return client;
}

async function execute(query, params = [], options = {}) {
  await connect();
  return client.execute(query, params, { prepare: true, ...options });
}

async function shutdown() {
  if (connectPromise) {
    await client.shutdown();
    connectPromise = null;
  }
}

module.exports = {
  client,
  connect,
  execute,
  shutdown,
};
