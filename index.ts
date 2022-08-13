// Import stylesheets
import Cropper from './cropper';
import './style.css';

// Write TypeScript code!
const appDiv: HTMLElement = document.getElementById('app');
const cropDiv: HTMLElement = document.getElementById('cropper');

const cropper = new Cropper({
  imageUrl: '/images/01.jpeg',
  target: cropDiv,
  width: 1330,
  height: 333,
  fitOnInit: true,
});
