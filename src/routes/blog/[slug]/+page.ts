import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const post = await import(`../../../posts/${params.slug}.md`);
		return {
			content: post.content,
			title: post.title,
			date: post.date,
			image: post.image
		};
	} catch (e) {
		throw error(404, 'Post not found');
	}
};
