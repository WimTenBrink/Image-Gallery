
import { Image, LogLevel } from '../types';

const BASE_URL = 'https://imagemarker.katje.org';

export type AddLogFunction = (level: LogLevel, header: string, body: any) => void;

const apiFetch = async <T,>(url: string, options: RequestInit, addLog: AddLogFunction): Promise<T> => {
  const fullUrl = `${BASE_URL}${url}`;
  
  const fetchOptions: RequestInit = { ...options };
  let requestBodyForLog: any = options.body;

  // Handle body and headers based on body type
  if (fetchOptions.body instanceof FormData) {
    // Let browser set Content-Type for FormData, so remove it from headers if it exists
    if (fetchOptions.headers) {
      delete (fetchOptions.headers as Record<string, string>)['Content-Type'];
    }
    requestBodyForLog = Object.fromEntries(fetchOptions.body.entries());
  } else if (typeof fetchOptions.body === 'string') {
    // Assume JSON for string bodies
    fetchOptions.headers = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers
    };
    try {
        requestBodyForLog = JSON.parse(fetchOptions.body);
    } catch (e) {
      // Not a JSON string, log as is
    }
  }

  const requestDetails = {
    method: fetchOptions.method || 'GET',
    headers: { ...fetchOptions.headers },
    body: requestBodyForLog,
  };

  addLog(LogLevel.API, `Request: ${requestDetails.method} ${url}`, requestDetails);

  try {
    const response = await fetch(fullUrl, fetchOptions);
    const responseClone = response.clone();
    
    let responseBody: any;
    try {
        responseBody = await response.json();
    } catch (e) {
        responseBody = await responseClone.text();
    }
    
    const responseLog = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    };

    if (!response.ok) {
        addLog(LogLevel.ERROR, `API Error: ${response.status} ${url}`, responseLog);
        throw new Error(typeof responseBody === 'object' && responseBody !== null ? responseBody?.message || 'API request failed' : responseBody);
    }

    addLog(LogLevel.API, `Response: ${response.status} ${url}`, responseLog);
    return responseBody as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred';
    addLog(LogLevel.ERROR, `Network/Fetch Error: ${url}`, { error: errorMessage, request: requestDetails });
    throw error;
  }
};

const apiFetchText = async (url: string, options: RequestInit, addLog: AddLogFunction): Promise<string> => {
    const fullUrl = `${BASE_URL}${url}`;
    const fetchOptions: RequestInit = { ...options };
  
    const requestDetails = {
      method: fetchOptions.method || 'GET',
      headers: { ...fetchOptions.headers },
      body: 'N/A for this request type',
    };
  
    addLog(LogLevel.API, `Request: ${requestDetails.method} ${url}`, requestDetails);
  
    try {
      const response = await fetch(fullUrl, fetchOptions);
      const responseText = await response.text();
      
      const responseLog = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: `[Content of type text/html, length: ${responseText.length}]`
      };
  
      if (!response.ok) {
          addLog(LogLevel.ERROR, `API Error: ${response.status} ${url}`, responseLog);
          throw new Error(`API request failed with status ${response.status}`);
      }
  
      addLog(LogLevel.API, `Response: ${response.status} ${url}`, responseLog);
      return responseText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred';
      addLog(LogLevel.ERROR, `Network/Fetch Error: ${url}`, { error: errorMessage, request: requestDetails });
      throw error;
    }
};

const apiFetchBlob = async (url: string, options: RequestInit, addLog: AddLogFunction): Promise<Blob> => {
  const fullUrl = `${BASE_URL}${url}`;
  
  const fetchOptions: RequestInit = { ...options };
  let requestBodyForLog: any = options.body;
  
  // Handle body and headers based on body type
  if (fetchOptions.body instanceof FormData) {
    // Let browser set Content-Type for FormData, so remove it from headers if it exists
    if (fetchOptions.headers) {
      delete (fetchOptions.headers as Record<string, string>)['Content-Type'];
    }
    requestBodyForLog = Object.fromEntries(fetchOptions.body.entries());
  } else if (typeof fetchOptions.body === 'string') {
    // Assume JSON for string bodies
    fetchOptions.headers = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers
    };
    try {
        requestBodyForLog = JSON.parse(fetchOptions.body);
    } catch (e) {
      // Not a JSON string, log as is
    }
  }

  const requestDetails = {
    method: fetchOptions.method || 'GET',
    headers: { ...fetchOptions.headers },
    body: requestBodyForLog,
  };

  addLog(LogLevel.API, `Request: ${requestDetails.method} ${url}`, requestDetails);

  try {
    const response = await fetch(fullUrl, fetchOptions);
    
    if (!response.ok) {
        let errorBody: any;
        try {
            errorBody = await response.json();
        } catch(e) {
            errorBody = await response.text();
        }
        const responseLog = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorBody
        };
        addLog(LogLevel.ERROR, `API Error: ${response.status} ${url}`, responseLog);
        throw new Error(typeof errorBody === 'object' && errorBody !== null ? errorBody?.message || 'API request failed' : errorBody);
    }
    
    const blob = await response.blob();

    const responseLog = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: `[Blob data of type ${blob.type} and size ${blob.size} bytes]`
    };

    addLog(LogLevel.API, `Response: ${response.status} ${url}`, responseLog);
    return blob;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred';
    addLog(LogLevel.ERROR, `Network/Fetch Error: ${url}`, { error: errorMessage, request: requestDetails });
    throw error;
  }
};

export const getFolders = (addLog: AddLogFunction): Promise<string[]> => {
  return apiFetch('/Site/ImageFolders', {}, addLog);
};

export const getImages = (folderPath: string, addLog: AddLogFunction): Promise<string[]> => {
  const formData = new FormData();
  formData.append('path', folderPath);
  return apiFetch(`/Site/Images`, {
    method: 'POST',
    body: formData,
  }, addLog);
};

export const getImageData = (imagePath: string, addLog: AddLogFunction): Promise<Blob> => {
    const formData = new FormData();
    formData.append('name', imagePath);
    return apiFetchBlob(`/Site/Image`, {
        method: 'POST',
        body: formData,
    }, addLog);
};

export const getStories = (addLog: AddLogFunction): Promise<string[]> => {
    return apiFetch('/Site/Stories', {}, addLog);
};

export const getStory = (path: string, addLog: AddLogFunction): Promise<string> => {
    const encodedPath = encodeURIComponent(path);
    return apiFetchText(`/Site/Story?path=${encodedPath}`, {}, addLog);
};