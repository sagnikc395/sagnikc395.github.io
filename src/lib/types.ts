export type Categories = "tech" | "art" | "others" | "movies" | "life";

export type Post = {
    title: string;
    slug: string;
    description: string;
    date: string;
    categories: Categories[];
    published: boolean;
}
