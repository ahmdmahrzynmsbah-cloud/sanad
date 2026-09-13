let width = 2000;
let height = 1000;
let maxWidth = 400;
let maxHeight = 400;
if (width > maxWidth || height > maxHeight) {
  if (width > height) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  } else {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }
}
console.log(width, height);
