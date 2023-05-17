const fs = require('fs');
const path = require('path');

exports.deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            throw err;
        }
    });
}

exports.initFolders = () => {
    const pathList = ['images', path.join('data','invoices')];
    let rootDir = path.join(__dirname, '..');
    console.log('rootDir: %s',rootDir);
    pathList.forEach(dir => {
        if (!fs.existsSync(path.join(rootDir, dir))){
            fs.mkdirSync(path.join(rootDir, dir));
        }
    });
}