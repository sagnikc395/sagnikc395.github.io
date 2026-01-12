import { writable } from "svelte/store";
import { browser } from "$app/environment";

export const theme = writable('dark');

theme.subscribe((value) => {
    if(browser) {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
    }
});

