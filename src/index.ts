import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		joplin.commands.register({
			name: 'linkComplete',
			label: 'Complete the selection to a note title (if possible).',
			iconName: 'fas fa-angle-double-right',
			execute: async () => {
				const dialogs = joplin.views.dialogs;
				const notes = (await joplin.data.get(['notes']));
				const currentNote = await joplin.workspace.selectedNote();	
				const selectedText = (await joplin.commands.execute('selectedText') as string);
				const len_selection = selectedText.length;
				
				if (selectedText !== ""){
					//console.info('Clic !', selectedText);

					//Check if note already exists
					var idNotes = [];
					var titleNotes = [];
					var choiceList = [];
					for (let i in notes.items){
						//TODO : do a fuzzy search instead
						if (notes.items[i].title.toLowerCase().slice(0, len_selection) === selectedText.toLowerCase()){
							idNotes.push(notes.items[i].id);
							titleNotes.push(notes.items[i].title);
							choiceList.push({id : notes.items[i].id, title: notes.items[i].title});
						}

					}
					//var choice = prompt("Please choose :\n" + choiceList, "0");

					const handle = await dialogs.create();
					await dialogs.setHtml(handle, "Please choose");
					console.info(choiceList);
					await dialogs.setButtons(handle, choiceList);

					const choice = await dialogs.open(handle);

					const backlink = 'Linked from [' + currentNote.title + '](:/' + currentNote.id + ')';
					const linkedNote = (await joplin.data.get(['notes', choice.toString()], { fields: ['title','body'] }));
					const titleLinkedNote = linkedNote.title;
					const bodyLinkedNote = linkedNote.body;
					const newBodyLinkedNote = bodyLinkedNote + "\n" + backlink;
					await joplin.data.put(['notes', choice.toString()], null, { body: newBodyLinkedNote });

					const linkToNewNote = '[' + titleLinkedNote + '](:/' + choice + ')';

					await joplin.commands.execute('replaceSelection', linkToNewNote);
				}
			},
		});
		
		joplin.views.toolbarButtons.create('linkComplete', ToolbarButtonLocation.EditorToolbar);
	},
});
