import { mount } from 'svelte';
import App from './App.svelte';
import '../../micropolis/src/routes/styles.css';
import './desktop.css';
mount(App, { target: document.getElementById('app')! });
