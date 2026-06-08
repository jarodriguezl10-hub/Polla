const fs = require('fs');
fetch('http://localhost:3000/api/admin/recalculate', { method: 'POST' })
  .then(res => res.json())
  .then(data => {
    console.log(data);
    fs.writeFileSync('recalc_result.json', JSON.stringify(data));
  })
  .catch(console.error);
