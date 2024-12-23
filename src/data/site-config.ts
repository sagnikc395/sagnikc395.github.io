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

export type Subscribe = {
    title?: string;
    text?: string;
    formUrl: string;
};

export type SiteConfig = {
    logo?: Image;
    title: string;
    subtitle?: string;
    description: string;
    image?: Image;
    headerNavLinks?: Link[];
    footerNavLinks?: Link[];
    socialLinks?: Link[];
    hero?: Hero;
    subscribe?: Subscribe;
    postsPerPage?: number;
    projectsPerPage?: number;
};

const siteConfig: SiteConfig = {
    title: 'sagnikc395.github.io',
    subtitle: 'my personal garden on internet',
    description: '',
    image: {
        src: '',
        alt: ''
    },
    headerNavLinks: [
        {
            text: 'Home',
            href: '/'
        },
        {
            text: 'Projects',
            href: '/projects'
        },
        {
            text: 'Blog',
            href: '/blog'
        },
        {
            text: 'Tags',
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
        title: `thoughts on abstractions, logic and philosophy! it's gonna be a fun ride 🫶`,
        text: `I'm Sagnik Chatterjee, a Software Developer at IBM India, working in Backend Engineering (Java, SpringBoot) and Distributed Systems (HBase, Apache Kafka).
I am interested in Programming Languages (especially the Functional Programming paradigm) and Type Theory. I particularly appreciate how gradual typing enables us to create amazing software with both the safety of static typing and the flexibility of dynamically typed languages like Racket and Typed Racket.
I have recently developed an interest in mathematical logic and proof-oriented programming languages like Lean, exploring how they help formally verify software.
Feel free to explore my coding endeavors on GitHub or follow me on X.`,
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

    postsPerPage: 8,
    projectsPerPage: 8
};

export default siteConfig;
