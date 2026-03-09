const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(srcDir).filter(f => f.endsWith('.js'));
let errors = 0;

console.log(`Checking ${files.length} files for import errors...`);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const importRegex = /require\(['"](#backend\/|#infra\/|#ai\/)([^'"]+)['"]\)/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        const fullImport = match[1] + match[2];
        try {
            require.resolve(fullImport, { paths: [path.dirname(file)] });
        } catch (e) {
            console.error(`Error in ${path.relative(__dirname, file)}: Cannot resolve ${fullImport}`);
            errors++;
        }
    }
});

if (errors === 0) {
    console.log('All subpath imports verified successfully!');
} else {
    console.error(`Found ${errors} resolution errors.`);
    process.exit(1);
}
