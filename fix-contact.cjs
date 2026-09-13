const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `    contactInfo: updatedContact,
  });
});

// Reset Contact Info to Default`,
  `    contactInfo: updatedContact,
  });
  } catch (err: any) {
    next(err);
  }
});

// Reset Contact Info to Default`
);
fs.writeFileSync('server.ts', code);
console.log("Fixed contact try-catch");
