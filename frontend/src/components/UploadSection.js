import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, VStack, Text, Select, Stack, HStack, Image, Progress } from '@chakra-ui/react';
import { FaFileUpload, FaExchangeAlt, FaTrashAlt } from 'react-icons/fa';
import CustomButton from './CustomButton';
import axios from 'axios';

// convert seconds to mm:ss format
const formatDuration = (durationInSeconds) => {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const UploadSection = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [thumbnailPath, setThumbnailPath] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('MP4');
  const [duration, setDuration] = useState(0);
  const [fileFormat, setFileFormat] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [videoId, setVideoId] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) {
      console.error('No file uploaded.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);
    setUploadedFile(file);

    // Upload video to the server
    axios.post('http://localhost:3000/videos/upload', formData, {
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      },
    })
      .then(response => {
        console.log('Upload successful:', response.data);
        setVideoId(response.data._id); // Assuming _id is the field name for video ID in your response
        setThumbnailPath(response.data.thumbnailPath);
        setFileFormat(response.data.format);
        setFileSize(response.data.size);
        setDuration(response.data.duration);
      })
      .catch(error => {
        console.error('Error uploading file:', error);
      });
  }, []);

  const handleFormatChange = (event) => {
    setSelectedFormat(event.target.value);
  };

  const handleConvert = async () => {
    if (!uploadedFile) {
      console.error('No file available for conversion.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('format', selectedFormat);

      const response = await axios.post('http://localhost:3000/videos/convert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Conversion successful:', response.data);
      setThumbnailPath(response.data.thumbnailPath);
    } catch (error) {
      console.error('Error during conversion:', error);
    }
  };

  const handleRemove = async () => {
    if (uploadedFile && videoId) {
      try {
        const response = await axios.delete(`http://localhost:3000/videos/delete/${videoId}`, {
          data: { videoPath: thumbnailPath.replace('uploads/thumbnails/', '') }
        });

        console.log('Video deleted:', response.data);
      } catch (error) {
        console.error('Error deleting video:', error);
      }
    }

    // Reset state after deletion
    setUploadedFile(null);
    setThumbnailPath('');
    setVideoId(null); // Reset videoId
    setSelectedFormat('MP4');
    setDuration(0);
    setFileFormat('');
    setFileSize(0);
    setUploadProgress(0);
  };




  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Box bg="gray.50" p={8}>
      {uploadedFile ? (
        <VStack
          background="gray.800"
          rounded={10} p={6}
          textAlign="left" color="white"
          spacing={4}
          width={{ base: "md", md: "2xl" }}
        >
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Progress width="100%" value={uploadProgress} colorScheme="purple" hasStripe isAnimated />
          )}
          <Stack direction={{ base: "column", md: "row" }} align={"center"}>
            {thumbnailPath && (
              <Image
                src={`http://localhost:3000/${thumbnailPath}`}
                alt="Video Thumbnail"
                boxSize="sm"
                objectFit="cover"
                borderRadius="md"
              />
            )}
            <VStack align="start" ml={4}>
              <Select value={selectedFormat} onChange={handleFormatChange}>
                <option value="MP4">MP4</option>
                <option value="MKV">MKV</option>
                <option value="WMV">WMV</option>
                <option value="AVI">AVI</option>
                <option value="MOV">MOV</option>
                <option value="VOB">VOB</option>
              </Select>
              <Text>File Format: {fileFormat.toUpperCase()}</Text>
              <Text>Size: {Math.round(fileSize / 1024 / 1024)} MB</Text>
              <Text>Duration: {formatDuration(duration)}</Text> {/* Updated to mm:ss format */}
            </VStack>
          </Stack>
          <HStack spacing={4}>
            <CustomButton leftIcon={FaTrashAlt} onClick={handleRemove} bg="gray.500">
              Remove
            </CustomButton>
            <CustomButton leftIcon={FaExchangeAlt} onClick={handleConvert} bg="blue.600">
              Convert
            </CustomButton>
          </HStack>
        </VStack>
      ) : (
        <Box
          background="gray.200"
          rounded={10}
          px={{ base: "30px", md: "150px" }}
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
      )}
    </Box>
  );
};

export default UploadSection;
