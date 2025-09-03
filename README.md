# OpenAI-HTML-Client
This is a simple, local-only interface for interacting with the OpenAI API. It's a single HTML file that you can run directly in your web browser, I did this because I was given a key to interact with the OpenAI API at university, but sometimes I just want to use ChatGPT Premium's features in a simple web interface. Feel free to contribute.
<div align="center">
  <table border="0">
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/32c9dff8-2c59-4ade-b406-79fa1219e4d7" alt="Desktop View" height="400">
      </td>
      <td>
        <img src="https://github.com/user-attachments/assets/1e04dd13-dbb6-4f9a-9c80-901d63e5cc8f" alt="Mobile View" height="400">
      </td>
    </tr>
  </table>
</div>
    

***

# Local ChatGPT UI

This is a simple, local-only interface for interacting with the OpenAI API. It's a single HTML file that you can run directly in your web browser.

The main goal is to provide a straightforward chat experience without needing to install anything or run a web server. All your data, including your API key and chat history, is stored on your own computer in the browser's local storage.

## How to Use

It's designed to be as easy as possible to get started:

1.  Download the project files (click `Code` > `Download ZIP`).
2.  Unzip the folder.
3.  Double-click the `index.html` file to open it in your browser.

That's it. Once it's open, you just need to enter your OpenAI API key, and it will load the available models.

## Functionality

Here is what the tool can do:

*   **Chat with the OpenAI API:** The main function is to send and receive messages.
*   **Save Chat Sessions:** Your conversations are automatically saved and grouped into different sessions that you can switch between.
*   **Edit Session Names:** You can rename your chat sessions.
*   **Import/Export:** You can export all your chats to a single JSON file or import them back in.
*   **File/Image Uploads:** Allows you to attach files and images to your prompts (for models that support it, like GPT-4o).
*   **Streaming Responses:** Shows the AI's response as it's being generated.
*   **Model Selection:** Lets you pick from the models available with your API key BUT it extract ALL of them, some are NOT working, and some don't even accept text as input, so fix it if you want to use it.

## Beta Features Disclaimer

Some of the more complex rendering features were added for convenience but are still in a **beta stage**. They are a terrible built and may have bugs or fail to render correctly in some cases.

*   **Markdown Detection:** Basic Markdown like headers and bold text should work, but it can be unreliable with more complex formatting.
*   **Code Block Detection:** It tries to find and highlight code blocks, but this might not always work as expected, especially with nested or oddly formatted code.
*   **LaTeX Rendering:** Support for math equations is experimental and may not render all expressions correctly (It may depend on the model chosen, some for some reason cannot maintain the LaTeX rules and do not render).


## Example of UI Usage
      
<div align="center">
  <table border="0">
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/693a6996-342d-49d8-9ccd-951253a6504f" alt="UI Usage Example" width="100%">
      </td>
    </tr>
  </table>
</div>
    
## Contributing

If you want to fix something or add a feature, feel free to do so. Since there is no build process, you can edit the `.js` and `.css` files directly and just refresh the page in your browser to see the changes.

It should be responsive to a acceptable level
