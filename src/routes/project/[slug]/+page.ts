import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const project = await import(`../../../projects/${params.slug}.md`);
		return {
			content: project.content,
			title: project.title,
			date: project.date,
			image: project.image,
			subimages: project.subimages
		};
	} catch (e) {
		throw error(404, 'Project not found');
	}
};
