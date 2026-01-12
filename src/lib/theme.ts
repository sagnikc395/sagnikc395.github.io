import { writable } from "svelte/store";
import { browser } from "$app/environment";

const initialTheme = browser 
? localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
: 'light';

export const theme = writable(initialTheme);


theme.subscribe((value) => {
    if(browser) {
        localStorage.setItem('theme',value);
        if(value === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
});

