export type Image = {
    src: string;
    alt?: string;
    caption?: string;
};

export type Link = {
    text: string;
    href: string;
};

export type Hero = {
    title?: string;
    text?: string;
    image?: Image;
    actions?: Link[];
};

export type SiteConfig = {
    logo?: Image;
    title?: string;
    sitename: string;
    subtitle?: string;
    description: string;
    image?: Image;
    headerNavLinks?: Link[];
    footerNavLinks?: Link[];
    socialLinks?: Link[];
    hero?: Hero;
    postsPerPage?: number;
    projectsPerPage?: number;
};

const siteConfig: SiteConfig = {
    sitename: `sagnik's little corner on the internet`,
    description: 'thoughts and stuff',
    image: {
        src: '/sagnikc.jpeg',
        alt: 'me trying to smile'
    },
    headerNavLinks: [
        {
            text: '~',
            href: '/'
        },
        {
            text: 'projects',
            href: '/projects'
        },
        {
            text: 'blog',
            href: '/blog'
        },
        {
            text: 'tags',
            href: '/tags'
        }
    ],
    footerNavLinks: [
        {
            text: 'About',
            href: '/about'
        },
        {
            text: 'Contact',
            href: '/contact'
        },
        {
            text: 'Source',
            href: 'https://github.com/sagnikc395/sagnikc395.github.io.git'
        }
    ],
    socialLinks: [
        {
            text: 'Github',
            href: 'https://github.com/sagnikc395'
        },
        {
            text: 'X',
            href: 'https://twitter.com/sagnikcw'
        }
    ],
    hero: {
        title: `thoughts on programming, abstractions and logic!it's gonna be a fun ride 🫶`,
        text: `hey I'm Sagnik. While I work in Backend Development in IBM as my job, i'm interested in the domain of Functional Programming and Type Theory.
        I have been currently obsessing over how modern software stack can be built using LLMs and Proof Oriented Design.`,
        image: {
            src: '/hero.jpg',
            alt: 'a oil painting of countryside'
        },
        actions: [
            {
                text: 'Get in Touch',
                href: '/contact'
            }
        ]
    },

    postsPerPage: 6,
    projectsPerPage: 4
};

export default siteConfig;
