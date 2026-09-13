const fs = require('fs');
let lines = fs.readFileSync('server.ts', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i] === '  } catch (err: any) { next(err); }') {
    if (lines[i-1] === '});') {
      // Swap them
      lines[i-1] = '  } catch (err: any) { next(err); }';
      lines[i] = '});';
    }
  }
}

fs.writeFileSync('server.ts', lines.join('\n'));
