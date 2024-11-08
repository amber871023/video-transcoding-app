import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, VStack, Text, Select, Stack, HStack, Image, Progress, IconButton, Tag, TagLabel, CircularProgress, CircularProgressLabel, Alert, AlertIcon, Button, useToast } from '@chakra-ui/react';
import { FaFileUpload, FaExchangeAlt, FaTrashAlt, FaDownload, FaFileVideo, FaFileMedical } from 'react-icons/fa';
import CustomButton from './CustomButton';
import axios from 'axios';

// const baseUrl = "http://localhost:3001";
const baseUrl = "https://group50.cab432.com/api";

const UploadSection = () => {
  const [videoFiles, setVideoFiles] = useState([]);
  const [conversionStarted, setConversionStarted] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);
  const toast = useToast(); // Initialize Chakra's toast hook

  const allowedFormats = ['MP4', 'MPEG', 'WMV', 'AVI', 'MOV', 'WEBM']; // Define allowed formats

  useEffect(() => {
    if (videoFiles.length === 0) {
      setConversionStarted(false);
    }
  }, [videoFiles]);

  const onDrop = useCallback((acceptedFiles) => {
    const newVideoFiles = [];
    const newErrorMessages = [];

    acceptedFiles.forEach(file => {
      const fileFormat = file.name.split('.').pop().toUpperCase();
      if (allowedFormats.includes(fileFormat)) {
        newVideoFiles.push({
          file,
          originalFormat: fileFormat,
          thumbnailPath: '',
          format: 'MP4',
          size: 0,
          duration: 0,
          id: null,
          status: 'WAITING',
          uploadProgress: 0,
          conversionProgress: 0,
          convertedFormat: null,
        });
      } else {
        newErrorMessages.push(`${file.name} format is not allowed to convert.`);
      }
    });

    setVideoFiles(prevFiles => [...prevFiles, ...newVideoFiles]);
    setErrorMessages(newErrorMessages);
  }, []);

  const handleUpload = async (file, index) => {
    // Check if the selected format is the same as the original format
    if (file.originalFormat.toLowerCase() === file.format.toLowerCase()) {
      toast({
        title: 'Conversion Error',
        description: 'The selected format is the same as the original format. Please choose a different format.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      updateFileStatus(index, 'Failed');
      return; // Stop further processing
    }
    try {
      const formData = new FormData();
      formData.append('video', file.file);

      updateFileStatus(index, 'Uploading');

      const response = await axios.post(`${baseUrl}/videos/upload`, formData, { withCredentials: true }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          updateFileUploadProgress(index, percentCompleted);
        },
      });

      // Update file data with response from the server
      updateFileData(index, {
        videoId: response.data.videoId,
        thumbnailPath: response.data.thumbnailPath,
        size: response.data.size,
        duration: response.data.duration,
        originalFormat: response.data.format.toUpperCase(),
      });

      updateFileStatus(index, 'Uploaded');
      await handleConvert({ ...file, videoId: response.data.videoId }, index);
    } catch (error) {
      updateFileStatus(index, 'Failed');

      if (error.message.includes('Network Error') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        toast({
          title: 'Connection Error',
          description: 'Failed to upload the video. Connection is down.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });

        // Retry logic after detecting backend is available again
        const retryInterval = setInterval(async () => {
          try {
            // Check if the backend is available by making a test request
            await axios.get(`${baseUrl}/status`, { timeout: 3000 }, { withCredentials: true });

            // If backend is back, retry the upload
            clearInterval(retryInterval); // Stop retry attempts
            toast({
              title: 'Backend Available',
              description: 'Backend is available. Retrying upload...',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
            await handleUpload(file, index);
          } catch (retryError) {
            console.log('Still no connection, retrying...');
          }
        }, 5000);
      }
    }
  };

  const updateFileUploadProgress = (index, progress) => {
    setVideoFiles(prevFiles => {
      if (!prevFiles[index]) {
        return prevFiles;
      }
      const updatedFiles = [...prevFiles];
      updatedFiles[index].uploadProgress = progress;
      return updatedFiles;
    });
  };

  const updateFileConversionProgress = (index, progress) => {
    if (progress < 0 || progress > 100) {
      console.error(`Invalid progress value: ${progress}`);
      return;
    }
    setVideoFiles(prevFiles => {
      if (!prevFiles[index]) {
        return prevFiles;
      }
      const updatedFiles = [...prevFiles];
      updatedFiles[index].conversionProgress = progress;
      return updatedFiles;
    });
  };

  const handleConvert = async (file, index) => {
    if (!file.videoId) {
      console.error('Cannot convert without a video ID.');
      return;
    }

    if (!videoFiles[index]) {
      console.error(`No video file found at index ${index}`);
      return;
    }

    try {
      updateFileStatus(index, 'Processing');
      const formData = new FormData();
      formData.append('videoId', file.videoId);
      formData.append('format', file.format.toLowerCase());

      const response = await fetch(`${baseUrl}/videos/convert`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        const cleanedChunk = chunk.trim().replace(/^data:\s*/, '');
        const progress = Number(cleanedChunk);

        if (!isNaN(progress)) {
          updateFileConversionProgress(index, progress);

          if (progress >= 100) {
            updateFileStatus(index, 'Completed');
            const convertedFormat = file.format.toUpperCase();
            updateFileData(index, { convertedFormat });
          }
        }
      }
    } catch (error) {
      updateFileStatus(index, 'Failed');
      // Retry logic: Exponential Backoff
      if (
        error.message.includes('network error') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('ERR_INCOMPLETE_CHUNKED_ENCODING')
      ) {
        toast({
          title: 'Connection Error',
          description: 'Failed to convert the video. Connection is down.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });

        // Retry logic using exponential backoff
        let attempt = 1;
        const maxAttempts = 5;
        const retryInterval = setInterval(async () => {
          try {
            const healthResponse = await axios.get(`${baseUrl}/status`, { timeout: 5000 }, {
              withCredentials: true, // Important for CORS
            });

            if (healthResponse.status === 200) {
              clearInterval(retryInterval);
              toast({
                title: 'Backend Available',
                description: 'Backend is available. Retrying conversion...',
                status: 'success',
                duration: 3000,
                isClosable: true,
              });

              // Use localStorage to persist and continue conversion from last known progress
              localStorage.setItem('conversion', JSON.stringify({ file, index }));
              await handleConvert(file, index);
            }
          } catch (retryError) {
            console.log(`Attempt ${attempt} failed, retrying...`);
            if (attempt >= maxAttempts) {
              clearInterval(retryInterval);
              toast({
                title: 'Conversion Failed',
                description: 'Maximum retry attempts reached. Please try again later.',
                status: 'error',
                duration: 3000,
                isClosable: true,
              });
            }
            attempt++;
          }
        }, Math.min(attempt * 2000, 10000));  // Exponential backoff with max 10 seconds delay
      }
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await fetch(`${baseUrl}/videos/download/${file.videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download file.');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', file.title || 'downloaded_video');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl); // Clean up the URL object

    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download the file.');
    }
  };

  const updateFileStatus = (index, status) => {
    setVideoFiles(prevFiles => {
      if (!prevFiles[index]) {
        return prevFiles;
      }
      const updatedFiles = [...prevFiles];
      updatedFiles[index].status = status;
      return updatedFiles;
    });
  };

  const updateFileData = (index, data) => {
    setVideoFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      updatedFiles[index] = { ...updatedFiles[index], ...data };
      return updatedFiles;
    });
  };

  const handleRemove = async (index) => {
    const videoToDelete = videoFiles[index];

    if (videoToDelete && videoToDelete.videoId) {
      try {
        await axios.delete(`${baseUrl}/videos/delete/${videoToDelete.videoId}`, {
          withCredentials: true, // Important for CORS
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
          },
        });
        setVideoFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
      } catch (error) {
        console.error('Error deleting video:', error);
      }
    } else {
      setVideoFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    }
  };

  const renderStatus = (file) => {
    switch (file.status) {
      case 'Uploading':
        return (
          <HStack spacing={2}>
            <Text color="orange.500">Uploading..</Text>
            <Progress hasStripe value={file.uploadProgress} colorScheme="orange" size="sm" width="100px" />
          </HStack>
        );
      case 'Processing':
        return (
          <HStack spacing={2}>
            <CircularProgress
              value={file.conversionProgress}
              color="blue.500"
              size="40px"
              thickness="8px"
            >
              <CircularProgressLabel>{`${file.conversionProgress}%`}</CircularProgressLabel>
            </CircularProgress>
            <Text color="blue.500">Converting..</Text>
          </HStack>
        );
      case 'Completed':
        return <Tag size='lg' borderRadius='full' bg={"green.500"} color={"white"} ><TagLabel>Completed</TagLabel></Tag>;
      case 'Failed':
        return <Tag size='lg' borderRadius='full' bg={"red.500"} color={"white"} ><TagLabel>Failed</TagLabel></Tag>;
      default:
        return <Tag size='lg' borderRadius='full' bg={"yellow.400"} color={"white"}><TagLabel>Waiting</TagLabel></Tag>;
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Box bg="gray.50" p={8} width="100%">
      {(!conversionStarted || videoFiles.length === 0) && (
        <VStack spacing={4} mt={4}>
          <Box
            background="gray.200"
            rounded={10}
            px={{ base: "30px", md: "200px" }}
            py={{ base: "70px", md: "20" }}
            textAlign="center"
            borderWidth="4px"
            borderColor={isDragActive ? "purple.500" : "gray.300"}
            borderStyle={isDragActive ? "solid" : "dashed"}
            {...getRootProps()}
          >
            <input {...getInputProps()} />
            <VStack spacing={4}>
              <Text fontSize="2xl" fontWeight="bold">
                Convert Your Videos Easily
              </Text>
              <Text fontSize="md" color="gray.600">
                A user-friendly platform for converting your videos to various formats.
              </Text>
              <CustomButton leftIcon={FaFileUpload}>
                Upload Files
              </CustomButton>
              <Text fontSize="sm" color="gray.500">
                Drag & drop files here or click to select files
              </Text>
            </VStack>
          </Box>
        </VStack>
      )}
      {errorMessages.length > 0 && (
        <Box mt={4}>
          {errorMessages.map((message, index) => (
            <Alert key={index} status="error">
              <AlertIcon />
              {message}
            </Alert>
          ))}
        </Box>
      )}
      {videoFiles.map((file, index) => (
        <Box
          key={file.file.name}
          background="gray.100"
          rounded={10} p={4} mt={5}
          textAlign="left"
          color="black"
          spacing={4}
          width="100%"
          boxShadow={"md"}
        >
          <Stack direction={{ base: "column", md: "row" }} align="center" justify="space-between">
            <HStack align="center">
              {file.thumbnailPath ? (
                <Image
                  src={`${file.thumbnailPath}`}
                  alt="Video Thumbnail"
                  boxSize="100px"
                  objectFit="cover"
                  borderRadius="md"
                />
              ) : (
                <FaFileVideo size={"25px"} />
              )}
              <VStack align={'flex-start'}>
                <Text fontWeight="bold">{file.file.name}</Text>
                <Text fontSize={"sm"}>File Format: {file.originalFormat}</Text>
                <Text fontSize={"sm"}>Size: {Math.round(file.file.size / 1024 / 1024)} MB</Text>
                {file.convertedFormat && (
                  <Text fontSize={"sm"}>Converted File Type: {file.convertedFormat}</Text>
                )}
              </VStack>
            </HStack>
            <HStack width={{ base: "100%", md: "50%" }} justify={{ base: "center", md: "end" }} alignContent={"center"}>
              {renderStatus(file)}
              {file.status !== 'Completed' && file.status !== 'Uploading' && (
                <>
                  <Select
                    width={"40%"}
                    value={file.format}
                    onChange={(e) => {
                      const newFiles = [...videoFiles];
                      newFiles[index].format = e.target.value;

                      // Reset the status to 'WAITING' when format is changed
                      newFiles[index].status = 'WAITING';

                      // Clear any error messages
                      setErrorMessages([]);

                      setVideoFiles(newFiles);
                    }}
                  >
                    <option value="MP4">MP4</option>
                    <option value="WEBM">WEBM</option>
                    <option value="MOV">MOV</option>
                    <option value="FLV">FLV</option>
                    <option value="AVI">AVI</option>
                    <option value="MPEG">MPEG</option>
                  </Select>

                  <IconButton
                    aria-label="Remove File"
                    icon={<FaTrashAlt />}
                    colorScheme="red"
                    onClick={() => handleRemove(index)}
                  />
                </>
              )}
              {file.status === 'Completed' && (
                <Box display="flex" justifyContent="flex-end">
                  <CustomButton
                    px={5} mr={2}
                    leftIcon={FaDownload}
                    onClick={() => handleDownload(file)}
                  >
                    Download
                  </CustomButton>
                  <IconButton
                    aria-label="Remove File"
                    icon={<FaTrashAlt />}
                    colorScheme="red"
                    onClick={() => handleRemove(index)}
                  />
                </Box>
              )}
            </HStack>
          </Stack>
        </Box>
      ))}
      {conversionStarted && (
        <Box display="flex" justifyContent="flex-end" mt={5}>
          <Button
            px={5} mr={2}
            colorScheme='gray'
            leftIcon={FaFileMedical}
            onClick={() => setConversionStarted(false)}
          >
            Convert other videos
          </Button>
        </Box>
      )}

      {videoFiles.length > 0 && (
        <Box display="flex" justifyContent="flex-end">
          {videoFiles.some(file => file.status === 'WAITING') && (
            <CustomButton
              mt={4} px={5}
              leftIcon={FaExchangeAlt}
              onClick={() => {
                setConversionStarted(true);
                videoFiles.forEach((file, index) => {
                  if (file.status === 'WAITING') {
                    handleUpload(file, index);
                    setErrorMessages([]); // Clear any previous error messages
                  }
                });
              }}
            >
              Convert
            </CustomButton>
          )}
        </Box>
      )}
    </Box>
  );
};

export default UploadSection;

