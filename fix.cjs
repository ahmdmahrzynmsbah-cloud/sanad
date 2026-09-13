const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      siteOverview: db.settings.siteOverview,
    },
  });
});`;

const replacement = `      siteOverview: db.settings.siteOverview,
    },
  });
  } catch (err) {
    next(err);
  }
});`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Fixed!");
} else {
  console.log("Not found.");
}
