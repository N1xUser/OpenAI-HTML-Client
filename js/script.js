class ChatGPTUI {
    constructor() {

        this.messages = [];

        this.apiKey = '';
        this.selectedModel = '';
        this.streamingEnabled = true;
        this.uploadedFiles = [];
        this.currentSessionId = null;
        this.sessions = new Map();
        this.isFirstMessage = true;

        this.isSidebarVisible = true;
        this.currentStreamingMessage = null;

        this.autoSaveTimeout = null;
        this.autoSaveDelay = 2000;

        this.availableModels = [];

        this.initialize();
    }

    initialize() {
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.loadSessions();
        this.setupMobileMenu();
        this.setupSidebarResizing();
    }

    setupSidebarResizing() {
        const startResize = (e) => {
            e.preventDefault();
            this.sidebarResizer.classList.add('resizing');
            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
        };

        const doResize = (e) => {
            const newWidth = e.clientX;
            const minWidth = parseInt(getComputedStyle(this.sidebar).minWidth, 10);
            const maxWidth = parseInt(getComputedStyle(this.sidebar).maxWidth, 10);

            if (newWidth > minWidth && newWidth < maxWidth) {
                this.appContainer.style.setProperty('--sidebar-width', `${newWidth}px`);
            }
        };

        const stopResize = () => {
            this.sidebarResizer.classList.remove('resizing');
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);

            const finalWidth = this.appContainer.style.getPropertyValue('--sidebar-width');
            localStorage.setItem('chatgpt_ui_sidebar_width', finalWidth);
        };

        this.sidebarResizer.addEventListener('mousedown', startResize);
    }

    initializeElements() {

        this.appContainer = document.getElementById('appContainer');


        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.clearButton = document.getElementById('clearButton');
        this.typingIndicator = document.getElementById('typingIndicator');


        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.modelSelect = document.getElementById('modelSelect');
        this.refreshModelsBtn = document.getElementById('refreshModelsBtn');
        this.streamingCheckbox = document.getElementById('streamingCheckbox');
        this.modelInfo = document.getElementById('modelInfo');
        this.mainControls = document.getElementById('mainControls');


        this.fileInput = document.getElementById('fileInput');
        this.fileUploadBtn = document.getElementById('fileUploadBtn');
        this.imageUploadBtn = document.getElementById('imageUploadBtn');
        this.uploadedFilesContainer = document.getElementById('uploadedFiles');


        this.newChatBtn = document.getElementById('newChatBtn');
        this.sessionsList = document.getElementById('sessionsList');
        this.sessionNameInput = document.getElementById('sessionNameInput');
        this.exportSessionBtn = document.getElementById('exportSessionBtn');
        this.autoSaveIndicator = document.getElementById('autoSaveIndicator');


        this.importAllBtn = document.getElementById('importAllBtn');
        this.exportAllBtn = document.getElementById('exportAllBtn');
        this.deleteAllBtn = document.getElementById('deleteAllBtn');
        this.importFileInput = document.getElementById('importFileInput');



        this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.mainContent = document.getElementById('mainContent');
        this.sidebarResizer = document.getElementById('sidebarResizer');

        this.configSection = document.getElementById('configSection');
    }


    bindEvents() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.clearButton.addEventListener('click', () => this.clearChat());
        this.messageInput.addEventListener('keydown', (e) => this.handleMessageKeydown(e));
        this.messageInput.addEventListener('input', () => this.adjustTextareaHeight());

        this.apiKeyInput.addEventListener('input', (e) => this.handleAPIKeyChange(e.target.value));
        this.modelSelect.addEventListener('change', (e) => this.updateModel(e.target.value));
        this.refreshModelsBtn.addEventListener('click', () => this.loadModels());

        this.streamingCheckbox.addEventListener('change', (e) => {
            this.updateStreaming(e.target.checked);
            e.target.closest('.streaming-toggle').classList.toggle('checked', e.target.checked);
        });


        this.newChatBtn.addEventListener('click', () => this.createNewSession());
        this.exportSessionBtn.addEventListener('click', () => this.exportCurrentSession());
        this.sessionNameInput.addEventListener('input', () => this.scheduleAutoSave());


        this.exportAllBtn.addEventListener('click', () => this.exportAllSessions());
        this.importAllBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', (e) => this.handleImportAll(e));
        this.deleteAllBtn.addEventListener('click', () => this.deleteAllSessions());



        this.sessionsList.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.session-delete-btn');
            if (deleteButton) {
                const sessionId = deleteButton.dataset.sessionId;
                this.deleteSession(sessionId);
                return;
            }

            const sessionContent = e.target.closest('.session-content');
            if (sessionContent) {
                const sessionId = sessionContent.dataset.sessionId;
                this.loadSession(sessionId);
            }
        });


        this.fileUploadBtn.addEventListener('click', () => this.openFileDialog('all'));
        this.imageUploadBtn.addEventListener('click', () => this.openFileDialog('images'));
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));


        document.addEventListener('paste', (e) => this.handlePaste(e));
        window.addEventListener('beforeunload', () => this.performAutoSave());
        
        this.mainContent.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.mainContent.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.mainContent.addEventListener('drop', (e) => this.handleDrop(e));

        setInterval(() => {
            if (this.messages.length > 0) {
                this.performAutoSave();
            }
        }, 30000);
    }


    setupMobileMenu() {
        this.mobileMenuToggle.addEventListener('click', () => {
            this.sidebar.classList.toggle('show');
            this.sidebarOverlay.classList.toggle('show');
        });
        this.sidebarOverlay.addEventListener('click', () => {
            this.sidebar.classList.remove('show');
            this.sidebarOverlay.classList.remove('show');
        });
    }

    checkScreenWidth() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && this.isSidebarVisible) {
            this.closeMobileMenu(true);
        } else if (!isMobile && !this.isSidebarVisible) {
            this.openMobileMenu(true);
        }
    }

    toggleMobileMenu() {
        if (this.isSidebarVisible) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu(instant = false) {
        if (instant) {
            this.sidebar.style.transition = 'none';
            this.mainContent.style.transition = 'none';
        } else {
            this.sidebar.style.transition = 'transform var(--transition-slow)';
            this.mainContent.style.transition = 'all var(--transition-slow)';
        }

        this.sidebar.classList.add('show');
        this.sidebarOverlay.classList.add('show');
        this.mobileMenuToggle.classList.add('active');
        this.mainContent.classList.remove('sidebar-hidden');
        this.isSidebarVisible = true;

        if (instant) {
            setTimeout(() => {
                this.sidebar.style.transition = '';
                this.mainContent.style.transition = '';
            }, 50);
        }
    }

    closeMobileMenu(instant = false) {
        if (instant) {
            this.sidebar.style.transition = 'none';
            this.mainContent.style.transition = 'none';
        } else {
            this.sidebar.style.transition = 'transform var(--transition-slow)';
            this.mainContent.style.transition = 'all var(--transition-slow)';
        }

        this.sidebar.classList.remove('show');
        this.sidebarOverlay.classList.remove('show');
        this.mobileMenuToggle.classList.remove('active');
        this.mainContent.classList.add('sidebar-hidden');
        this.isSidebarVisible = false;

        if (instant) {
            setTimeout(() => {
                this.sidebar.style.transition = '';
                this.mainContent.style.transition = '';
            }, 50);
        }
    }



    loadSettings() {
        try {

            const savedWidth = localStorage.getItem('chatgpt_ui_sidebar_width');
            if (savedWidth) {
                this.appContainer.style.setProperty('--sidebar-width', savedWidth);
            }


            const savedApiKey = localStorage.getItem('chatgpt_ui_api_key');
            const savedModel = localStorage.getItem('chatgpt_ui_selected_model');
            const savedStreaming = localStorage.getItem('chatgpt_ui_streaming');

            if (savedApiKey) {
                this.apiKey = savedApiKey;
                this.apiKeyInput.value = savedApiKey;
                this.loadModels();
            }

            if (savedModel) {
                this.selectedModel = savedModel;
            }

            if (savedStreaming !== null) {
                this.streamingEnabled = savedStreaming === 'true';
                this.streamingCheckbox.checked = this.streamingEnabled;
                this.streamingCheckbox.closest('.streaming-toggle').classList.toggle('checked', this.streamingEnabled);
            }
        } catch (error) {
            console.warn('Could not load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('chatgpt_ui_api_key', this.apiKey);
            localStorage.setItem('chatgpt_ui_selected_model', this.selectedModel);
            localStorage.setItem('chatgpt_ui_streaming', this.streamingEnabled.toString());
        } catch (error) {
            console.warn('Could not save settings:', error);
        }
    }


    async handleAPIKeyChange(key) {
        this.apiKey = key;
        this.saveSettings();

        if (key.trim()) {
            await this.loadModels();
        } else {
            this.clearModels();
            this.configSection.classList.remove('api-key-valid');
        }
    }

    clearModels() {
        this.modelSelect.innerHTML = '<option value="">Enter API key to load models</option>';
        this.availableModels = [];
        this.updateModelInfo();
    }

    async loadModels() {
        if (!this.apiKey.trim()) {
            this.clearModels();
            return;
        }

        this.refreshModelsBtn.disabled = true;
        this.modelSelect.innerHTML = '<option value="">Loading models...</option>';

        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load models: ${response.status}`);
            }

            const data = await response.json();
            this.availableModels = this.sortModels(data.data);
            this.populateModelSelect();
            this.configSection.classList.add('api-key-valid');
        } catch (error) {
            this.showError(`Failed to load models: ${error.message}`);
            this.modelSelect.innerHTML = '<option value="">Failed to load models</option>';
            this.configSection.classList.remove('api-key-valid');
        } finally {
            this.refreshModelsBtn.disabled = false;
        }
    }

    sortModels(models) {
        const chatModels = ['gpt-4', 'gpt-3.5-turbo', 'o1', 'o3', 'o4'];
        return models.sort((a, b) => {
            const aIsChat = chatModels.some(model => a.id.includes(model));
            const bIsChat = chatModels.some(model => b.id.includes(model));

            if (aIsChat && !bIsChat) return -1;
            if (!aIsChat && bIsChat) return 1;

            return a.id.localeCompare(b.id);
        });
    }

    populateModelSelect() {
        this.modelSelect.innerHTML = '<option value="">Select a model</option>';

        this.availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            this.modelSelect.appendChild(option);
        });

        this.selectDefaultModel();
    }

    selectDefaultModel() {
        if (this.selectedModel && this.availableModels.some(m => m.id === this.selectedModel)) {
            this.modelSelect.value = this.selectedModel;
            this.updateModelInfo();
        } else {
            const preferredModels = ['chatgpt-4o-latest','gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
            for (const preferred of preferredModels) {
                if (this.availableModels.some(model => model.id === preferred)) {
                    this.modelSelect.value = preferred;
                    this.updateModel(preferred);
                    break;
                }
            }
        }
    }

    updateModel(model) {
        this.selectedModel = model;
        this.saveSettings();
        this.updateModelInfo();
        this.updateFileUploadAvailability();
    }

    updateModelInfo() {
        if (!this.selectedModel) {
            this.modelInfo.textContent = 'Select a model to see information';
            return;
        }

        let infoText = `Model: ${this.selectedModel}`;

        if (this.isMultiModalModel(this.selectedModel)) {
            infoText += ' • Supports images';
        }

        if (this.selectedModel.includes('gpt-4')) {
            infoText += ' • High capability';
        } else if (this.selectedModel.includes('gpt-3.5')) {
            infoText += ' • Fast & efficient';
        }

        this.modelInfo.textContent = infoText;
    }

    updateStreaming(enabled) {
        this.streamingEnabled = enabled;
        this.saveSettings();
    }


    isMultiModalModel(modelId) {
        if (!modelId) {
            return false;
        }

        const exactMatchAllowlist = [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4.1',
            'gpt-image-1'
        ];
        if (exactMatchAllowlist.includes(modelId)) {
            return true;
        }

        const exactMatchBlacklist = [
            'whisper-1',
            'tts-1',
            'text-embedding-3-large',
            'dall-e-3'
        ];
        if (exactMatchBlacklist.includes(modelId)) {
            return false;
        }

        const multiModalPrefixes = [
            'gpt-4.1-',
            'gpt-4o-2'
        ];

        return multiModalPrefixes.some(prefix => modelId.startsWith(prefix));
    }

    isImageGenerationModel(modelId) {
        if (!modelId) {
            return false;
        }
        const imageModels = ['dall-e-3', 'gpt-image-1'];
        return imageModels.includes(modelId);
    }

    updateFileUploadAvailability() {
        const isMultiModal = this.isMultiModalModel(this.selectedModel);
        const isImageGeneration = this.isImageGenerationModel(this.selectedModel);

        this.fileUploadBtn.disabled = !isMultiModal;
        this.imageUploadBtn.disabled = !isMultiModal;

        if ((isImageGeneration && !isMultiModal) && this.uploadedFiles.length > 0) {
            this.clearUploadedFiles();
        }
    }

    openFileDialog(type) {
        if (type === 'images') {
            this.fileInput.accept = 'image/*';
        } else {
            this.fileInput.accept = '.py,.cpp,.js,.java,.cs,.html,.php,.css,.json,.xml,.rb,.ts,.txt,.md,.csv,.docx,.xlsx,.pptx,.pdf,image/*';
        }
        this.fileInput.click();
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        if (!this.isMultiModalModel(this.selectedModel)) {
            this.showTemporaryMessage('Selected model does not support file uploads', 'error');
            return;
        }

        for (const file of files) {
            try {
                await this.processFile(file);
            } catch (error) {
                this.showTemporaryMessage(`Failed to process {error.message}`, 'error');
            }
        }

        this.updateUploadedFilesDisplay();
        event.target.value = '';
    }

    async processFile(file) {
        if (file.type.startsWith('image/')) {
            const base64 = await this.fileToBase64(file);
            this.uploadedFiles.push({
                type: 'image',
                name: file.name,
                data: base64,
                mimeType: file.type
            });
        } else {
            const text = await this.fileToText(file);
            this.uploadedFiles.push({
                type: 'text',
                name: file.name,
                data: text,
                mimeType: file.type
            });
        }
    }

    async handlePaste(event) {
        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                try {
                    await this.processFile(file);
                    this.updateUploadedFilesDisplay();
                } catch (error) {
                    this.showTemporaryMessage(`Failed to process pasted file: ${error.message}`, 'error');
                }
            }
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    fileToText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    updateUploadedFilesDisplay() {
        this.uploadedFilesContainer.innerHTML = '';
        this.uploadedFilesContainer.classList.remove('active');

        if (this.uploadedFiles.length === 0) return;


        const fileCounter = document.createElement('div');
        fileCounter.className = 'icon-btn';
        fileCounter.innerHTML = `<span style="font-size: 14px;">${this.uploadedFiles.length}</span>`;
        fileCounter.title = `${this.uploadedFiles.length} file(s) attached`;


        const popup = document.createElement('div');
        popup.className = 'file-list-popup';

        this.uploadedFiles.forEach((file, index) => {
            const fileDiv = this.createFileElement(file, index);
            popup.appendChild(fileDiv);
        });

        this.uploadedFilesContainer.append(fileCounter, popup);


        fileCounter.addEventListener('click', (e) => {
            e.stopPropagation();
            this.uploadedFilesContainer.classList.toggle('active');
        });


        document.addEventListener('click', (e) => {
            if (!this.uploadedFilesContainer.contains(e.target)) {
                this.uploadedFilesContainer.classList.remove('active');
            }
        }, {
            once: true
        });
    }

    createFileElement(file, index) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'uploaded-file';
        const fileName = this.escapeHtml(file.name);

        const fileIcon = file.type === 'image' ?
            `<img src="${file.data}" alt="thumbnail">` :
            '📄';

        fileDiv.innerHTML = `${fileIcon}<span class="uploaded-file-name">${fileName}</span><button class="remove-file-btn" onclick="chatUI.removeUploadedFile(${index})">×</button>`;


        fileDiv.querySelector('.remove-file-btn').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return fileDiv;
    }

    removeUploadedFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.updateUploadedFilesDisplay();
    }

    clearUploadedFiles() {
        this.uploadedFiles = [];
        this.updateUploadedFilesDisplay();
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.mainContent.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.mainContent.classList.remove('drag-over');
    }

    async handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.mainContent.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) {
            return;
        }

        if (!this.isMultiModalModel(this.selectedModel)) {
            this.showTemporaryMessage('Selected model does not support file uploads', 'error');
            return;
        }

        for (const file of files) {
            try {
                await this.processFile(file);
            } catch (error) {
                this.showTemporaryMessage(`Failed to process ${file.name}: ${error.message}`, 'error');
            }
        }

        this.updateUploadedFilesDisplay();
    }

    handleMessageKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    adjustTextareaHeight() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 150) + 'px';
    }


    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message && this.uploadedFiles.length === 0) return;

        if (!this.currentSessionId) {
            this.createNewSession();
        }

        if (this.isFirstMessage) {
            this.chatMessages.innerHTML = '';
        }

        if (!this.validateSendConditions()) return;

        if (this.isImageGenerationModel(this.selectedModel)) {
            await this.sendImageGenerationRequest(message);
        } else {
            const messageContent = this.createMultimodalContent(message);


            let displayHtml = '';
            if (this.uploadedFiles.length > 0) {
                this.uploadedFiles.forEach(file => {
                    if (file.type === 'text') {
                        const summaryElement = this.createFileSummary(file.name, file.data);
                        displayHtml += summaryElement.outerHTML;
                    } else if (file.type === 'image') {
                        displayHtml += `<img src="${file.data}" alt="${this.escapeHtml(file.name)}" style="display: block; max-height: 90px; border-radius: 8px; margin-bottom: 12px;">`;
                    }
                });
            }
            if (message.trim()) {
                displayHtml += `<div class="user-message-text">${this.escapeHtml(message)}</div>`;
            }


            this.addMessage('user', displayHtml, true);
            this.messages.push({
                role: 'user',
                content: messageContent
            });

            this.resetMessageInput();
            this.prepareForResponse();

            try {
                if (this.streamingEnabled) {
                    await this.sendStreamingMessage();
                } else {
                    await this.sendNonStreamingMessage();
                }
            } catch (error) {

                this.addErrorMessageToChat(error.message);
            } finally {

                this.finishResponse();
            }
        }
    }

    async sendImageGenerationRequest(prompt) {
        this.addMessage('user', prompt);
        this.messages.push({
            role: 'user',
            content: prompt
        });

        this.resetMessageInput();
        this.prepareForResponse();

        try {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.selectedModel,
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024"
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || response.statusText);
            }

            const data = await response.json();
            const imageUrl = data.data[0].url;
            const imageMarkdown = `![Generated Image](${imageUrl})`;

            this.addMessage('assistant', imageMarkdown);
            this.messages.push({
                role: 'assistant',
                content: imageMarkdown
            });

        } catch (error) {
            this.addErrorMessageToChat(error.message);
        } finally {
            this.finishResponse();
        }
    }

    validateSendConditions() {
        if (!this.apiKey) {
            this.showError('Please enter your OpenAI API key first.');
            return false;
        }
        if (!this.selectedModel) {
            this.showError('Please select a model first.');
            return false;
        }
        return true;
    }

    prepareMessageContent(message) {
        let finalMessage = message;
        if (this.isFirstMessage && message.trim()) {
            finalMessage = message + '\n\nAnother request:\nBased on what i asked you, how should this session title be? answer with this format but instead of AI Title, with what you think it should be: /X/ AI Title /X/\n\nBe short, dont mention OpenAI API, if the user says hi, just make a message of the day oriented to help\n\nThen follow the normal answer of my original request and remember to use ```code ``` format when you writte related code';
        }

        let messageContent, displayContent;

        if (this.uploadedFiles.length > 0 && this.isMultiModalModel(this.selectedModel)) {
            messageContent = this.createMultimodalContent(finalMessage);
            displayContent = this.createMultimodalContent(message);
        } else {
            messageContent = finalMessage;
            displayContent = message;
        }

        return {
            messageContent,
            displayContent
        };
    }

    createMultimodalContent(textMessage) {
        const content = [];

        if (textMessage) {
            content.push({
                type: 'text',
                text: textMessage
            });
        }

        this.uploadedFiles.forEach(file => {
            if (file.type === 'image') {
                content.push({
                    type: 'image_url',
                    image_url: {
                        url: file.data
                    }
                });
            } else {
                content.push({
                    type: 'text',
                    text: `\n\n--- Start of File: ${file.name} ---\n\n\`\`\`\n${file.data}\n\`\`\`\n--- End of File: ${file.name} ---`
                });
            }
        });

        return content;
    }

    resetMessageInput() {
        this.messageInput.value = '';
        this.clearUploadedFiles();
        this.messageInput.style.height = 'auto';
    }

    prepareForResponse() {
        this.sendButton.disabled = true;
        this.showTypingIndicator();
        this.scheduleAutoSave();
        this.scrollToBottom();
    }

    finishResponse() {
        this.sendButton.disabled = false;
        this.hideTypingIndicator();
    }


    async sendStreamingMessage() {
        const requestBody = this.createRequestBody(true);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Expect this kind of messages on not know models of OpenAI, this is a simple chat project and that model may not be suopported:\n - ${errorData.error?.message || response.statusText}`);
        }

        await this.processStreamingResponse(response);
    }

    async processStreamingResponse(response) {
        const assistantMessage = this.createMessageElement('assistant', '');
        const messageContent = assistantMessage.querySelector('.message-content');

        this.chatMessages.appendChild(assistantMessage);


        const cursor = document.createElement('span');
        cursor.className = 'streaming-cursor';

        messageContent.appendChild(cursor);

        this.currentStreamingMessage = {
            element: messageContent,
            content: '',
            cursor: cursor
        };

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const {
                    done,
                    value
                } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, {
                    stream: true
                });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    await this.processStreamLine(line);
                }
            }
        } finally {
            this.finalizeStreamingMessage();
            this.scrollToBottom();
        }
    }

    async processStreamLine(line) {
        if (!line.startsWith('data: ')) return;

        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
                this.currentStreamingMessage.content += delta;
                this.updateStreamingMessage();
            }
        } catch (e) {

        }
    }
    updateSessionTimestampAndSave() {
        if (!this.currentSessionId) return;

        const session = this.sessions.get(this.currentSessionId);
        if (!session) return;


        session.updatedAt = Date.now();
        this.sessions.set(this.currentSessionId, session);

        this.updateSessionsList();
        this.saveSessions();
    }
    updateStreamingMessage() {
        if (!this.currentStreamingMessage) return;

        let displayContent = this.currentStreamingMessage.content;


        if (this.isFirstMessage) {
            const {
                title,
                cleanedContent
            } = this.extractSessionTitleFromResponse(displayContent);
            if (title) {
                this.sessionNameInput.value = title;
                displayContent = cleanedContent;
            }
        }

        const formattedContent = this.formatMessageContent(displayContent);
        this.currentStreamingMessage.element.innerHTML = formattedContent + '<span class="streaming-cursor"></span>';

        this.currentStreamingMessage.cursor = this.currentStreamingMessage.element.querySelector('.streaming-cursor');

        setTimeout(() => {
            if (this.currentStreamingMessage && this.currentStreamingMessage.element.parentNode) {
                this.renderMathJax(this.currentStreamingMessage.element);
            }
        }, 50);
    }

    finalizeStreamingMessage() {
        if (!this.currentStreamingMessage) return;

        let finalContent = this.currentStreamingMessage.content;


        if (this.isFirstMessage) {
            const {
                title,
                cleanedContent
            } = this.extractSessionTitleFromResponse(finalContent);
            if (title) {
                this.sessionNameInput.value = title;
                finalContent = cleanedContent;
            }
            this.isFirstMessage = false;
        }


        this.currentStreamingMessage.element.innerHTML = this.formatMessageContent(finalContent);
        this.currentStreamingMessage.cursor.remove();

        this.messages.push({
            role: 'assistant',
            content: finalContent
        });
        this.scheduleAutoSave();

        this.updateSessionTimestampAndSave();

        this.currentStreamingMessage = null;
        setTimeout(() => this.renderMathJax(), 50);
    }


    async sendNonStreamingMessage() {
        const requestBody = this.createRequestBody(false);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Expect this kind of messages on not know models of OpenAI, this is a simple chat project and that model may not be suopported:\n - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        let assistantResponse = data.choices[0].message.content;

        if (this.isFirstMessage) {
            const {
                title,
                cleanedContent
            } = this.extractSessionTitleFromResponse(assistantResponse);
            if (title) {
                this.sessionNameInput.value = title;
                assistantResponse = cleanedContent;
            }
            this.isFirstMessage = false;
        }

        this.addMessage('assistant', assistantResponse);
        this.messages.push({
            role: 'assistant',
            content: assistantResponse
        });
        this.scheduleAutoSave();
        this.updateSessionTimestampAndSave();
    }

    createRequestBody(streaming) {
        const messagesForApi = JSON.parse(JSON.stringify(this.messages));

        if (this.isFirstMessage && messagesForApi.length > 0) {
            const hiddenPrompt = '\n\nAnother request:\nBased on what i asked you, how should this session title be? answer with this format but instead of AI Title, with what you think it should be: /X/ AI Title /X/\n\nBe short, dont mention OpenAI API, if the user says hi, just make a message of the day oriented to help\n\nThen follow the normal answer of my original request and remember to use ```code ``` format when you writte related code';

            const lastMessage = messagesForApi[messagesForApi.length - 1];

            if (Array.isArray(lastMessage.content)) {
                lastMessage.content.push({
                    type: 'text',
                    text: hiddenPrompt
                });
            } else if (typeof lastMessage.content === 'string') {
                lastMessage.content += hiddenPrompt;
            }
        }

        const requestBody = {
            model: this.selectedModel,
            messages: messagesForApi.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            stream: streaming
        };

        const requiresMaxCompletionTokens = this.selectedModel.startsWith('o1') ||
            this.selectedModel.startsWith('o3') ||
            this.selectedModel.startsWith('o4') ||
            this.selectedModel.startsWith('gpt-5');

        if (requiresMaxCompletionTokens) {
            requestBody.max_completion_tokens = 4000;
        } else {
            requestBody.max_tokens = 4000;
        }


        const hasTemperatureRestriction = this.selectedModel.startsWith('o1') ||
                                          this.selectedModel.startsWith('o3') ||
                                          this.selectedModel.startsWith('o4') ||
                                          this.selectedModel.startsWith('gpt-5') ||
                                          this.isSearchPreviewModel(this.selectedModel);

        if (!hasTemperatureRestriction) {
            requestBody.temperature = 0.7;
        }

        return requestBody;
    }

    isSearchPreviewModel(modelId) {
        return modelId?.includes('search-preview');
    }


    loadSessions() {
        try {
            const saved = localStorage.getItem('chatgpt_ui_sessions');
            if (saved) {
                const sessionsData = JSON.parse(saved);
                if (Array.isArray(sessionsData)) {
                    this.sessions = new Map(sessionsData);
                } else if (sessionsData && typeof sessionsData === 'object') {
                    this.sessions = new Map(Object.entries(sessionsData));
                }


                this.sessions.forEach(session => {
                    if (!session.updatedAt) {
                        session.updatedAt = session.createdAt || Date.now();
                    }
                });
            }


            const lastSessionId = localStorage.getItem('chatgpt_ui_last_session_id');

            if (lastSessionId && this.sessions.has(lastSessionId)) {

                this.loadSession(lastSessionId);
            } else if (this.sessions.size > 0) {

                const sortedSessions = Array.from(this.sessions.values())
                    .sort((a, b) => b.updatedAt - a.updatedAt);
                this.loadSession(sortedSessions[0].id);
            } else {

                this.createNewSession();
            }

        } catch (error) {
            console.warn('Could not load sessions:', error);
            this.sessions = new Map();
            this.createNewSession();
        }
    }

    saveSessions() {
        try {
            const sessionsArray = Array.from(this.sessions.entries());
            localStorage.setItem('chatgpt_ui_sessions', JSON.stringify(sessionsArray));
        } catch (error) {
            console.warn('Could not save sessions:', error);
        }
    }

    createNewSession() {
        const sessionId = 'session_' + Date.now();
        const session = {
            id: sessionId,
            name: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.sessions.set(sessionId, session);
        this.loadSession(sessionId);
        this.updateSessionsList();
        this.saveSessions();
    }

    loadSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        this.currentSessionId = sessionId;
        localStorage.setItem('chatgpt_ui_last_session_id', sessionId);

        this.messages = [...session.messages];
        this.sessionNameInput.value = session.name;
        this.isFirstMessage = this.messages.length === 0;

        if (this.isFirstMessage) {
            this.chatMessages.innerHTML = `<div class="message assistant"><div class="message-content">Hello! To begin, please type your message in the text box below.</div></div>`;
        } else {
            this.renderMessages();
        }

        this.updateSessionsList();
    }

    updateSessionsList() {
        this.sessionsList.innerHTML = '';

        const sortedSessions = Array.from(this.sessions.values())
            .sort((a, b) => b.updatedAt - a.updatedAt);

        sortedSessions.forEach(session => {
            const sessionElement = this.createSessionElement(session);
            this.sessionsList.appendChild(sessionElement);
        });
    }

    createSessionElement(session) {
        const div = document.createElement('div');
        div.className = `session-item ${session.id === this.currentSessionId ? 'active' : ''}`;


        div.innerHTML = `<div class="session-content" data-session-id="${session.id}"><div class="session-name">${this.escapeHtml(session.name)}</div><div class="session-date">Updated: ${this.formatTime(session.updatedAt)}</div><div class="session-date created-date">Created: ${new Date(session.createdAt).toLocaleDateString()}</div></div><button class="session-delete-btn" data-session-id="${session.id}" title="Delete session">×</button>`;
        return div;
    }

    resetToEmptyState() {

        this.sessionsList.innerHTML = '';
        this.chatMessages.innerHTML = `<div class="message assistant"><div class="message-content">Hello! All chats have been cleared. Type a message below to start a new conversation.</div></div>`;
        this.sessionNameInput.value = '';


        this.messages = [];
        this.currentSessionId = null;
        this.isFirstMessage = true;
        this.clearUploadedFiles();



        localStorage.removeItem('chatgpt_ui_last_session_id');
    }
    deleteSession(sessionId) {


        if (!this.sessions.has(sessionId)) return;


        this.sessions.delete(sessionId);
        this.saveSessions();


        if (this.currentSessionId === sessionId) {
            if (this.sessions.size > 0) {
                const sortedSessions = Array.from(this.sessions.values())
                    .sort((a, b) => b.updatedAt - a.updatedAt);
                this.loadSession(sortedSessions[0].id);
            } else {

                this.resetToEmptyState();
            }
        } else {


            this.updateSessionsList();
        }
    }


    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => this.performAutoSave(), this.autoSaveDelay);
    }

    performAutoSave() {
        if (!this.currentSessionId) return;

        const session = this.sessions.get(this.currentSessionId);
        if (!session) return;

        session.name = this.sessionNameInput.value || 'New Chat';
        session.messages = [...this.messages];


        this.sessions.set(this.currentSessionId, session);

        this.saveSessions();
        this.showAutoSaveIndicator();
    }

    showAutoSaveIndicator() {
        this.autoSaveIndicator.style.opacity = '1';
        setTimeout(() => {
            this.autoSaveIndicator.style.opacity = '0';
        }, 2000);
    }


    addMessage(role, content, isHtml = false) {
        const messageElement = this.createMessageElement(role, content, isHtml);
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
        setTimeout(() => this.renderMathJax(messageElement), 50);
    }

    createMessageElement(role, content, isHtml = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const formattedContent = isHtml ? content : this.formatMessageContent(content);

        const copyClass = role === 'system' ? 'message-copy-s' :
            role === 'user' ? 'message-copy-u' :
            'message-copy';

        messageDiv.innerHTML = `<div class="message-content">${formattedContent}</div><div class="message-actions"><button class="${copyClass}" onclick="chatUI.copyMessage(this)" title="Copy message">📋</button></div>`;

        return messageDiv;
    }

    formatMessageContent(content) {
        if (!content) return '';

        if (Array.isArray(content)) {
            let fullContent = '';
            content.forEach(part => {
                if (part.type === 'text') {
                    fullContent += `<div>${this.formatMessageContent(part.text)}</div>`;
                } else if (part.type === 'image_url') {
                    fullContent = `<img src="${part.image_url.url}" alt="user-uploaded-image" style="display: block; max-width: 15vh; border-radius: 8px; margin-top: 8px; margin-bottom: 8px;"><hr><br>` + fullContent;
                }
            });
            return fullContent;
        }

        if (typeof content === 'string') {

            const codeBlocks = [];
            const placeholder = '---CODEBLOCK-PLACEHOLDER---' + Math.random();


            let processedText = this.processCodeBlocks(content, codeBlocks, placeholder);


            processedText = this.processLatex(processedText);


            processedText = this.processMarkdown(processedText);


            if (codeBlocks.length > 0) {
                processedText.split(placeholder).forEach((part, index) => {
                    if (index > 0) {
                        processedText = processedText.replace(placeholder, codeBlocks.shift());
                    }
                });
            }

            return processedText;
        }

        return '';
    }
    processMarkdown(content) {
        if (!content) return '';

        let formattedContent = content;
        
        formattedContent = formattedContent.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px; margin-top: 12px;">');

        formattedContent = formattedContent
            .replace(/^###### (.*$)/gim, '<h6 class="markdown-heading">$1</h6>')
            .replace(/^##### (.*$)/gim, '<h5 class="markdown-heading">$1</h5>')
            .replace(/^#### (.*$)/gim, '<h4 class="markdown-heading">$1</h4>')
            .replace(/^### (.*$)/gim, '<h3 class="markdown-heading">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="markdown-heading">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="markdown-heading">$1</h1>');
        formattedContent = formattedContent.replace(/^\s*---+\s*$/gm, '<hr>');

        formattedContent = formattedContent
            .replace(/\*\*(.*?)\*\*/g, '<strong class="markdown-bold">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');


        formattedContent = formattedContent.replace(/\n/g, '<br>');
        formattedContent = formattedContent.replace(/(<\/h[1-6]>|<hr>)(<br>\s*)+/gi, '$1');
        formattedContent = formattedContent.replace(/(<br>\s*)+(<h[1-6]|<hr>)/gi, '$2');

        return formattedContent;
    }

    renderMessages() {
        this.chatMessages.innerHTML = '';
        this.messages.forEach(msg => {
            if (msg.role !== 'system') {
                this.addMessage(msg.role, msg.content);
            }
        });
    }

    copyMessage(button) {
        const messageContent = button.closest('.message').querySelector('.message-content');
        const text = messageContent.innerText;

        navigator.clipboard.writeText(text).then(() => {
            this.showTemporaryMessage('Message copied!', 'success');
        }).catch(() => {
            this.showTemporaryMessage('Copy failed', 'error');
        });
    }

    clearChat() {
        if (confirm('Clear this chat? This action cannot be undone.')) {
            this.messages = [];
            this.isFirstMessage = true;
            this.chatMessages.innerHTML = '';
            this.clearUploadedFiles();
            this.performAutoSave();
        }
    }


    extractSessionTitleFromResponse(content) {
        const titleRegex = /\/X\/(.*?)\/X\//;
        const match = content.match(titleRegex);

        if (match) {
            const title = match[1].trim();
            const cleanedContent = content.replace(titleRegex, '').trim();
            return {
                title,
                cleanedContent
            };
        }

        return {
            title: null,
            cleanedContent: content
        };
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    getFileIcon(extension) {
        const icons = {
            js: '📄',
            html: '🌐',
            css: '🎨',
            py: '🐍',
            java: '☕',
            cpp: '🔧',
            c: '🔧',
            cs: '🔷',
            php: '🐘',
            rb: '💎',
            ts: '📘',
            json: '📋',
            xml: '📄',
            md: '📝',
            txt: '📄',
            csv: '📊',
            xlsx: '📊',
            docx: '📄',
            pdf: '📕'
        };
        return icons[extension] || '📄';
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    showError(message) {
        this.showTemporaryMessage(message, 'error');
    }

    showTemporaryMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }


    exportCurrentSession() {
        if (!this.currentSessionId) return;

        const session = this.sessions.get(this.currentSessionId);
        if (!session) return;

        const exportData = {
            sessionName: session.name,
            createdAt: new Date(session.createdAt).toISOString(),
            messages: session.messages.map(msg => ({
                role: msg.role,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }


    exportAllSessions() {
        if (this.sessions.size === 0) {
            this.showError("No sessions to export.");
            return;
        }

        const exportData = Array.from(this.sessions.entries());
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `chatgpt_ui_all_sessions_${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.showTemporaryMessage('All sessions exported!', 'success');
    }

    handleImportAll(event) {
        if (!confirm('Importing will replace all current chats. Are you sure you want to continue?')) {
            event.target.value = '';
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!Array.isArray(importedData)) {
                    throw new Error("Invalid format: Not an array.");
                }

                this.sessions = new Map(importedData);
                this.saveSessions();
                this.loadSessions();
                this.showTemporaryMessage('Sessions imported successfully!', 'success');

            } catch (error) {
                this.showError(`Import failed: ${error.message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.onerror = () => {
            this.showError('Failed to read the file.');
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    deleteAllSessions() {
        if (!confirm('Are you sure you want to delete ALL chats? This action is permanent and cannot be undone.')) {
            return;
        }

        this.sessions.clear();
        this.saveSessions();
        this.resetToEmptyState();

        this.createNewSession();
        this.showTemporaryMessage('All sessions have been deleted.', 'success');
    }



    addErrorMessageToChat(errorMessage) {

        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }

        const errorDiv = document.createElement('div');

        errorDiv.className = 'message error';


        const sanitizedMessage = this.escapeHtml(errorMessage);

        errorDiv.innerHTML = `<div class="message-content"><strong>API Error:</strong><br>${sanitizedMessage}</div>`;

        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }


    renderMathJax(element = null) {
        if (!window.MathJax?.typesetPromise) return;

        setTimeout(() => {
            try {
                const target = element?.parentNode ? [element] : undefined;
                window.MathJax.typesetPromise(target).catch(err =>
                    console.warn('MathJax error:', err)
                );
            } catch (err) {
                console.warn('MathJax rendering failed:', err);
            }
        }, 100);
    }

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        navigator.clipboard.writeText(element.innerText).then(() => {
            this.showTemporaryMessage('Copied to clipboard!', 'success');
        }).catch(() => {
            this.showTemporaryMessage('Copy failed', 'error');
        });
    }

    toggleFileSummary(summaryId) {
        const summary = document.getElementById(summaryId);
        summary?.classList.toggle('collapsed');
    }

    createFileSummary(fileName, fileContent) {
        const lines = fileContent.trim().split('\n');
        const summaryId = 'summary_' + Math.random().toString(36).substr(2, 9);
        const ext = fileName.split('.').pop().toLowerCase();

        const summary = document.createElement('div');
        summary.className = 'file-summary collapsed';
        summary.id = summaryId;
        summary.innerHTML = `<div class="file-summary-header" onclick="chatUI.toggleFileSummary('${summaryId}')"><span class="file-summary-icon">▼</span><div class="file-summary-info"><span class="file-summary-name">${this.getFileIcon(ext)} ${fileName}</span><span class="file-summary-stats">${lines.length} lines • ${this.formatFileSize(fileContent.length)}</span></div></div><div class="file-summary-content"><pre class="file-summary-text">${this.escapeHtml(fileContent)}</pre></div>`;
        return summary;
    }

    processLatex(content) {
        return content
            .replace(/\$\$([\s\S]+?)\$\$/g, '<div class="latex-display">$&</div>')
            .replace(/(?<!\\)\$([^\n$]+?)\$/g, '<span class="latex-inline">$&</span>');
    }

    processCodeBlocks(content, codeBlocks, placeholder) {

        return content.replace(/^\s*```(\w*)\n([\s\S]*?)\n\s*```/gm, (match, lang, code) => {
            const language = lang || 'text';
            const codeId = 'code_' + Math.random().toString(36).substr(2, 9);

            const escapedCode = this.escapeHtml(code);

            const blockHtml = `<div class="code-block"><div class="code-block-header"><span>${language}</span><button class="copy-btn" onclick="chatUI.copyToClipboard('${codeId}')">Copy</button></div><div class="code-block-content" id="${codeId}">${escapedCode}</div></div>`;

            codeBlocks.push(blockHtml);
            return placeholder;
        });
    }
}


let chatUI;
document.addEventListener('DOMContentLoaded', () => {
    chatUI = new ChatGPTUI();
});

