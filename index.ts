// Import stylesheets
import Cropper from './cropper';
import './style.css';

// Write TypeScript code!
const appDiv: HTMLElement = document.getElementById('app');

const crops = document.createElement('div');
appDiv.append(crops);

const cropper = new Cropper({ target: crops });

console.log(cropper.getOptions());
