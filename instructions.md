# Recreating the Image Gallery App

This document provides a comprehensive guide to building the Image Gallery web application from scratch. It's a modern, feature-rich application built with React, TypeScript, and Tailwind CSS.

## 1. Project Overview & Tech Stack

*   **Purpose**: To browse a remote image gallery provided by the ImageMarker REST API.
*   **Core Technologies**:
    *   **React**: For building the user interface.
    *   **TypeScript**: For static typing and improved developer experience.
    *   **Tailwind CSS**: For utility-first styling.
    *   **Vite/Create React App**: As a build tool and development server.

## 2. Setting Up the Project

First, create a new React project with TypeScript.

```bash
npx create-react-app image-gallery --template typescript
cd image-gallery
```

After creation, you can clean up the `src` folder by removing the default logo, test files, and boilerplate CSS.

## 3. Folder Structure

A well-organized folder structure is key. Create the following directories inside `/src`:

*   `/components`: For all React components (e.g., `Header.tsx`, `LeftPanel.tsx`).
*   `/hooks`: For custom React hooks (e.g., `useLogger.tsx`).
*   `/services`: For API communication logic (e.g., `api.ts`).
*   `/public`: For static assets like markdown files (`About.md`, `TOS.md`) and images (`splash.jpg`).
*   `types.ts`: A root file for all shared TypeScript type definitions.

## 4. Initial HTML and Global Styles (`index.html`)

Set up the main HTML file to include the Tailwind CSS CDN and define global styles for markdown and other elements.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Image Gallery</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      // Optional: Extend Tailwind's default theme
      tailwind.config = { /* ... */ }
    </script>
    <!-- Global Styles for Markdown -->
    <style>
      .markdown-content h1 { /* ... */ }
      .markdown-content p { /* ... */ }
      /* ... etc. */
    </style>
</head>
<body class="bg-gray-dark">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
</body>
</html>
```

## 5. Defining Core Types (`types.ts`)

Centralize all your data structures. This is crucial for a TypeScript project.

```typescript
// src/types.ts

export interface Image {
  id: string;
  name: string;
  fullPath: string;
  // other properties like width, height, exif...
}

export interface TreeNode {
  name: string;
  path: string;
  isSelectable: boolean;
  children: { [key: string]: TreeNode };
}

// ... other types like LogEntry, ModalType, etc.
```

## 6. Building the API Service (`services/api.ts`)

Create a dedicated module to handle all communication with the `https://imagemarker.katje.org` API.

*   Implement a generic `apiFetch` function that handles requests, responses, error handling, and logging.
*   Create specific functions for each endpoint:
    *   `getFolders()`: Fetches the list of all folder paths.
    *   `getImages(folderPath)`: Fetches image paths for a specific folder.
    *   `getImageData(imagePath)`: Fetches the actual image file as a Blob.
    *   `getStories()` and `getStory(path)`: For the "Stories" feature.
*   Make sure to handle different request body types (e.g., `FormData` for image/folder requests).

## 7. The Logging System (`hooks/useLogger.tsx`)

A built-in console is a key feature. Use React Context to provide a logging function throughout the app.

*   Create a `LoggerContext`.
*   The `LoggerProvider` component will manage the `logs` state.
*   The `addLog` function will add new entries to the state.
*   The `useLogger` custom hook will provide easy access to the `addLog` function for any component.

## 8. Creating the UI Components

Build the application piece by piece.

*   **`Header.tsx` & `Footer.tsx`**: Simple, static components for the top and bottom bars.
*   **`Modal.tsx`**: A generic modal component that takes a title and children.
*   **`Console.tsx`**: The UI for the logger. It should have tabs for different log levels and display log entries.
*   **`LeftPanel.tsx`**: This is a complex component.
    *   It manages state for "Folders" and "Stories" tabs.
    *   It recursively renders the `TreeNode` structure to display the folder/story tree.
    *   It handles expanding/collapsing nodes and loading images when a folder is selected.
*   **`MainPanel.tsx`**: The central viewing area.
    *   It conditionally renders content based on the `selectedItem` prop.
    *   Shows a welcome message initially.
    *   Displays a grid of thumbnails (`Thumbnail.tsx`) when a folder is selected.
    *   Displays a single, large image when an image is selected.
    *   Includes logic for fetching image data and parsing EXIF metadata from JPEG files.
*   **`RightPanel.tsx`**: Displays details about the `selectedItem` (image dimensions, file size, EXIF data, or folder info).

## 9. Assembling the Main Application (`App.tsx`)

This is where everything comes together.

*   Use CSS Grid to create the five-panel layout.
*   Manage the application's core state:
    *   `selectedItem`: The currently selected folder or image.
    *   `modalType`: Which modal (if any) is currently open.
    *   `imagesByFolder`: A cache of the images loaded for each folder.
*   Implement the main data-fetching logic:
    *   Fetch the initial folder and story trees.
    *   Implement `loadImagesForFolder` to be called by the `LeftPanel`.
*   Wire up all the components, passing state and callbacks as props.
*   Wrap the entire application in the `LoggerProvider`.

## 10. Final Touches

*   **Splash Screen**: In `App.tsx`, add state to show a splash screen for a few seconds before rendering the main layout. Use CSS transitions for a smooth fade-out effect.
*   **Assets**: Place your `About.md`, `TOS.md`, and a `splash.jpg` image in the `/public` directory so they can be accessed directly.
*   **Styling**: Use Tailwind CSS classes extensively for styling. Keep component-specific or complex styles within the component files or a global CSS file if necessary.

By following these steps, you can systematically construct the Image Gallery application, resulting in a robust, maintainable, and feature-complete project.
