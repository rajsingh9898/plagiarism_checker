const net = require('net');
const fs = require('fs');

const regions = [
  "us-east-1", "us-west-1", "us-west-2", "us-east-2",
  "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-northeast-3", "ap-south-1",
  "sa-east-1", "ca-central-1", "af-south-1"
];

async function checkRegion(region) {
  return new Promise((resolve) => {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const socket = new net.Socket();
    socket.setTimeout(2500);
    
    socket.on('connect', () => {
      const user = "postgres.okpvvaynbsgvdmurlufz";
      const db = "postgres";
      const payload = Buffer.alloc(1000);
      let offset = 4;
      payload.writeInt32BE(196608, offset); offset += 4;
      payload.write("user", offset); offset += 5;
      payload.write(user, offset); offset += user.length + 1;
      payload.write("database", offset); offset += 9;
      payload.write(db, offset); offset += db.length + 1;
      payload.writeInt8(0, offset); offset += 1;
      payload.writeInt32BE(offset, 0);
      socket.write(payload.slice(0, offset));
    });
    
    socket.on('data', (data) => {
      socket.destroy();
      const response = data.toString('utf8');
      if (response.includes("Tenant or user not found")) {
        resolve(false);
      } else {
        // Any other message means the tenant is active in this region
        resolve(true); 
      }
    });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(6543, host);
  });
}

async function main() {
  console.log("Searching for correct database region...");
  for (const r of regions) {
    process.stdout.write(`Testing ${r}... `);
    const exists = await checkRegion(r);
    if (exists) {
      console.log("FOUND!");
      const url = `postgresql://postgres.okpvvaynbsgvdmurlufz:BNcQwYMg7c%2CBZvi@aws-0-${r}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;
      let env = fs.readFileSync('.env', 'utf8');
      env = env.replace(/DATABASE_URL=".+"/, `DATABASE_URL="${url}"`);
      fs.writeFileSync('.env', env);
      console.log("Updated .env successfully with region: " + r);
      process.exit(0);
    } else {
      console.log("Not found.");
    }
  }
  console.log("Failed to find region.");
  process.exit(1);
}

main();
