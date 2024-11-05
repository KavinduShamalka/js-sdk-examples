db = db.getSiblingDB('supplychain');
db.createUser({
  user: 'admin',
  pwd: 'password',
  roles: [{ role: 'readWrite', db: 'supplychain' }]
});
