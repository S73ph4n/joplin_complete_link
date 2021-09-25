import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

async function createTodoInFolder(todoName, folderName){
	const notes = (await joplin.data.get(['notes']));
	//Find folder :
	const folders = await joplin.data.get(['folders']);
	var NAFolderID = "";
	for (let i in folders.items){
		if (folders.items[i].title == folderName){
			NAFolderID = folders.items[i].id;
		}
	}
	// if not, create it :
	if (NAFolderID == ""){
		NAFolderID = (await joplin.data.post(['folders'], null, { title: folderName, parent_id: "" })).id;
		//const NAFolderID = (await joplin.data.post(['folders'], null, { title: "Next Actions", parent_id: folders.items[0].id })).id;
	}

	//Check if note already exists
	var idNote = "";
	for (let i in notes.items){
		if (notes.items[i].parent_id == NAFolderID) {
			if (notes.items[i].title.toLowerCase() === todoName.toLowerCase()){
				idNote = notes.items[i].id;
			}
		}
	}
	// if not, create it :
	if (idNote == ""){
		idNote = (await joplin.data.post(['notes'], null, { title: todoName, parent_id: NAFolderID, is_todo: "1"})).id;
		//await joplin.data.put(['notes', idNote], null, { is_todo: "1" });
	}
	return(idNote);
}	

async function createBacklink(currentNote, linkedNote){
	const backlink = 'Linked from [' + currentNote.title + '](:/' + currentNote.id + ')';
	const titleLinkedNote = linkedNote.title;
	const bodyLinkedNote = linkedNote.body;
	const newBodyLinkedNote = bodyLinkedNote + "\n" + backlink;
	await joplin.data.put(['notes', linkedNote.id], null, { body: newBodyLinkedNote });

	const linkToNewNote = '[' + titleLinkedNote + '](:/' + linkedNote.id + ')';

	return(linkToNewNote);
}

async function extractLink(line){
	const nLine = line.split('](:/');
	if (nLine.length == 2){
		return(nLine[1].split(')')[0]);
	}
}

async function checkIfLineIsTask(line, done){
	var line0 = line;
	while (line0.startsWith(' ') || line0.startsWith('\t')){
		line0 = line0.slice(1)
	}
	if (! done && line0.startsWith('- [ ]')){
		return(true);
	}
	else if (done && line0.startsWith('- [x]')){
		return(true);
	}
	else{
		return(false)
	}
}

joplin.plugins.register({
	onStart: async function() {
		joplin.commands.register({
			name: 'makeNextAction',
			label: 'Send to Next Actions.',
			iconName: 'fas fa-file-import',
			execute: async () => {
				const currentNote = await joplin.workspace.selectedNote();	
				var selectedText = (await joplin.commands.execute('selectedText') as string);
				var linkToNewNote = "";
				
				if (selectedText !== ""){
					if (selectedText.startsWith('- [ ] ')){
						selectedText = selectedText.slice(6);
						linkToNewNote = '- [ ] ';
					}
					const idNote = await createTodoInFolder(selectedText, "Next Actions");
					const linkedNote = (await joplin.data.get(['notes', idNote], { fields: ['id', 'title','body'] }));
					linkToNewNote += await createBacklink(currentNote, linkedNote);
					await joplin.commands.execute('replaceSelection', linkToNewNote);
				}
			},
		});
		joplin.commands.register({
			name: 'makeWaitingFor',
			label: 'Send to Waiting For.',
			iconName: 'fas fa-user-clock',
			execute: async () => {
				const currentNote = await joplin.workspace.selectedNote();	
				var selectedText = (await joplin.commands.execute('selectedText') as string);
				var linkToNewNote = "";
				
				if (selectedText !== ""){
					if (selectedText.startsWith('- [ ] ')){
						selectedText = selectedText.slice(6);
						linkToNewNote = '- [ ] ';
					}
					const idNote = await createTodoInFolder(selectedText, "Waiting For");
					const linkedNote = (await joplin.data.get(['notes', idNote], { fields: ['id', 'title','body'] }));
					linkToNewNote += await createBacklink(currentNote, linkedNote);
					await joplin.commands.execute('replaceSelection', linkToNewNote);
				}
			},
		});
		joplin.commands.register({
			name: 'makeInbox',
			label: 'Send to Inbox.',
			iconName: 'fas fa-inbox',
			execute: async () => {
				const currentNote = await joplin.workspace.selectedNote();	
				var selectedText = (await joplin.commands.execute('selectedText') as string);
				var linkToNewNote = "";
				
				if (selectedText !== ""){
					if (selectedText.startsWith('- [ ] ')){
						selectedText = selectedText.slice(6);
						linkToNewNote = '- [ ] ';
					}
					const idNote = await createTodoInFolder(selectedText, "Inbox");
					const linkedNote = (await joplin.data.get(['notes', idNote], { fields: ['id', 'title','body'] }));
					linkToNewNote += await createBacklink(currentNote, linkedNote);
					await joplin.commands.execute('replaceSelection', linkToNewNote);
				}
			},
		});
		joplin.commands.register({
			name: 'checkTasksStatus',
			label: 'Update Tasks Status.',
			iconName: 'fas fa-binoculars',
			execute: async () => {
				// go through the note : check if task done here or in noteboks and update both
				const currentNote = await joplin.workspace.selectedNote();	
				const currentBody = currentNote.body.split('\n');
				var newBody = [];
				var idTodo = "";
				for (let line of currentBody){
					if (checkIfLineIsTask(line, false)){
						idTodo = await extractLink(line);
						console.info(idTodo);
						const is_done = ((await joplin.data.get(['notes', idTodo], { fields: ['todo_completed'] })).todo_completed !== 0);
						console.info(((await joplin.data.get(['notes', idTodo], { fields: ['todo_completed'] })).todo_completed !== 0));
						if (is_done && idTodo){
							//newBody.push('- [x]' + line.slice(5));
							newBody.push(line.split('- [ ]')[0] + '- [x]' + line.split('- [ ]')[1]);
						}
						else{
							newBody.push(line);
						}
					}
					else if (checkIfLineIsTask(line, true)){
						idTodo = await extractLink(line);
						const now = new Date();
						await joplin.data.put(['notes', idTodo], null, { todo_completed: now.getTime() });
						newBody.push(line);
					}
					else{
						newBody.push(line);
					}
				}
				var newBody_s = newBody.join('\n');
				await joplin.data.put(['notes', currentNote.id], null, { body: newBody_s });
				//TODO : refresh the note

			},
		});

		joplin.views.toolbarButtons.create('makeInbox','makeInbox', ToolbarButtonLocation.EditorToolbar);
		joplin.views.toolbarButtons.create('makeNextAction','makeNextAction', ToolbarButtonLocation.EditorToolbar);
		joplin.views.toolbarButtons.create('makeWaitingFor','makeWaitingFor', ToolbarButtonLocation.EditorToolbar);
		joplin.views.toolbarButtons.create('checkTasksStatus','checkTasksStatus', ToolbarButtonLocation.EditorToolbar);
	},
});
