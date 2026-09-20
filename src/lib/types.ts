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

/** A write-up of one reference from the reading list. */
export type Note = {
  title: string;
  date: string;
  content: string;
  /** The reference this note is about; links the note to its reading-list row. */
  paper?: string;
  authors?: string;
  /** Where the paper came from: a course, a reading group, a link dump. */
  venue?: string;
  tags?: string[];
  draft?: boolean;
  references?: Reference[];
};

/** Everything in a Note except the rendered body, plus the generated excerpt. */
export type NoteMeta = Omit<Note, "content"> & { excerpt?: string };
