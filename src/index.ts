import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		joplin.commands.register({
			name: 'linkComplete',
			label: 'Complete the selection to a note title (if possible).',
			iconName: 'fas fa-angle-double-right',
			execute: async () => {
				const notes = (await joplin.data.get(['notes']));
				const currentNote = await joplin.workspace.selectedNote();	
				const selectedText = (await joplin.commands.execute('selectedText') as string);
				const len_selection = selectedText.length;
				
				if (selectedText !== ""){
					//console.info('Clic !', selectedText);

					//Check if note already exists
					var idLinkedNote = 0;
					for (let i in notes.items){
						//TODO : do a fuzzy search instead
						if (notes.items[i].title.toLowerCase().slice(0, len_selection) === selectedText.toLowerCase()){
							idLinkedNote = notes.items[i].id;	
							const titleLinkedNote = notes.items[i].title;	
							console.info('Found note with title ', notes.items[i].title, selectedText ,idLinkedNote);
							const backlink = 'Linked from [' + currentNote.title + '](:/' + currentNote.id + ')';
							const bodyLinkedNote = (await joplin.data.get(['notes', idLinkedNote.toString()], { fields: ['body'] })).body;
							const newBodyLinkedNote = bodyLinkedNote + "\n" + backlink;
							await joplin.data.put(['notes', idLinkedNote.toString()], null, { body: newBodyLinkedNote });

							//const linkToNewNote = '[' + selectedText + '](:/' + idLinkedNote + ')';
							const linkToNewNote = '[' + titleLinkedNote + '](:/' + idLinkedNote + ')';

							await joplin.commands.execute('replaceSelection', linkToNewNote);
							break;
						}
					}
				}
			},
		});
		
		joplin.views.toolbarButtons.create('linkComplete', ToolbarButtonLocation.EditorToolbar);
	},
});
