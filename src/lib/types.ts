export type Reference =
  | string
  | {
      title?: string;
      url?: string;
      author?: string;
    };

export type Project = {
  title: string;
  date: string;
  content: string;
  repo: string;
  topics: string[];
  lead: string;
  image: string;
  image_border?: boolean;
  subimages?: string[];
  references?: Reference[];
};

export type Post = {
  title: string;
  date: string;
  content: string;
  image?: string;
  subimages?: string[];
  draft?: boolean;
  references?: Reference[];
};

