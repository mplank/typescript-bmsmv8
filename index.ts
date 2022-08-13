// Import stylesheets
import Cropper from './cropper';
import './style.css';

// Write TypeScript code!
const appDiv: HTMLElement = document.getElementById('app');
const cropDiv: HTMLElement = document.getElementById('cropper');

const cropper = new Cropper({
  imageUrl:
    'https://i.pinimg.com/originals/a5/13/a0/a513a04aa1f6a6ff689d2d71038d682a.jpg',
  target: cropDiv,
  width: 1330,
  height: 333,
  fitOnInit: true,
});
