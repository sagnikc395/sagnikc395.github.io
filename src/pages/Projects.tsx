import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../lib/components/Seo';
import { formatTime } from '../lib/utils';

const projects = import.meta.glob('../projects/*.md', {
	eager: true
}) as any;

const images = import.meta.glob('../projects/*.{png,jpg,svg}', {
	eager: true
}) as any;

function getSlug(id: string) {
	return id.match(/\.\.\/projects\/(.*)\.md$/)?.[1];
}

function isURL(path: string): boolean {
	try {
		new URL(path);
		return true;
	} catch {
		return false;
	}
}

function getImageUrl(path: string) {
	if (!path) return null;
	if (isURL(path)) return path;
	return images[`../projects/${path}`]?.default;
}

const Projects: React.FC = () => {
	const sortedProjectIds = Object.keys(projects).sort((a, b) => {
		const projA = projects[a].default || projects[a];
		const projB = projects[b].default || projects[b];
		const dateA = new Date(projA.date).getTime();
		const dateB = new Date(projB.date).getTime();
		return dateB - dateA;
	});

	return (
		<>
			<Seo title="Sagnik Chatterjee - Projects" description="my side projects" />

			<section className="layout-md">
				<p className="text-sm md:text-lg mb-4">
					<em> an index of some of my open source projects</em>
				</p>
				<hr className="border-stone-800" />
			</section>

			<div className="layout-md mt-10">
				<div className="grid gap-8">
					{sortedProjectIds.map((id) => {
						const project = projects[id].default || projects[id];
						const slug = getSlug(id);
						return (
							<Link
								key={id}
								to={`/project/${slug}`}
								className="group block p-6 border border-stone-800 rounded-xl hover:bg-stone-900 transition-all duration-200"
							>
								<div className="flex flex-col md:flex-row gap-6">
									{project.image && (
										<div className="w-full md:w-48 h-32 flex-shrink-0">
											<img
												src={getImageUrl(project.image)}
												alt={project.title}
												className="w-full h-full object-cover rounded-lg grayscale group-hover:grayscale-0 transition-all duration-500"
											/>
										</div>
									)}
									<div className="flex-grow">
										<div className="flex justify-between items-start mb-2">
											<h2 className="text-xl font-semibold text-stone-100 group-hover:text-blue-400 transition-colors">
												{project.title}
											</h2>
											{project.date && (
												<span className="text-stone-500 text-sm">
													{formatTime('%Y', project.date)}
												</span>
											)}
										</div>
										<p className="text-stone-400 line-clamp-2">
											{project.lead || 'Click to view project details...'}
										</p>
										<div className="mt-4 flex flex-wrap gap-2">
											{project.topics &&
												project.topics.map((topic: string) => (
													<span key={topic} className="px-2 py-1 text-xs bg-stone-800 text-stone-300 rounded">
														{topic}
													</span>
												))}
										</div>
									</div>
								</div>
							</Link>
						);
					})}
				</div>
			</div>
		</>
	);
};

export default Projects;
