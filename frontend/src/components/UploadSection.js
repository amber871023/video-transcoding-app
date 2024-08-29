import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, VStack, Text, Select, Stack, HStack, Image, Progress, IconButton, Tag, TagLabel } from '@chakra-ui/react';
import { FaFileUpload, FaExchangeAlt, FaTrashAlt, FaDownload, FaFileVideo } from 'react-icons/fa';
import CustomButton from './CustomButton';
import axios from 'axios';

const UploadSection = () => {
  const [videoFiles, setVideoFiles] = useState([]);
  const [conversionStarted, setConversionStarted] = useState(false);

  useEffect(() => {
    if (videoFiles.length === 0) {
      setConversionStarted(false);
    }
  }, [videoFiles]);

  const onDrop = useCallback((acceptedFiles) => {
    const newVideoFiles = acceptedFiles.map(file => ({
      file,
      originalFormat: file.name.split('.').pop().toUpperCase(),
      thumbnailPath: '',
      format: 'MP4',
      size: 0,
      duration: 0,
      id: null,
      status: 'WAITING',
      progress: 0,
    }));

    setVideoFiles(prevFiles => [...prevFiles, ...newVideoFiles]);
  }, []);

  const handleUpload = async (file, index) => {
    try {
      const formData = new FormData();
      formData.append('video', file.file);

      updateFileStatus(index, 'Uploading');

      const response = await axios.post('http://localhost:3000/videos/upload', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          updateFileProgress(index, percentCompleted);
        },
      });

      updateFileData(index, {
        id: response.data._id,
        thumbnailPath: response.data.thumbnailPath,
        size: response.data.size,
        duration: response.data.duration,
        originalFormat: response.data.format.toUpperCase(),
      });

      updateFileStatus(index, 'Uploaded');

      await handleConvert({ ...file, id: response.data._id }, index);

    } catch (error) {
      console.error('Error uploading file:', error);
      updateFileStatus(index, 'Failed');
    }
  };

  const handleConvert = async (file, index) => {
    if (!file.id) {
      console.error('Cannot convert without a video ID.');
      return;
    }

    try {
      updateFileStatus(index, 'Processing');

      const formData = new FormData();
      formData.append('videoId', file.id);
      formData.append('format', file.format.toLowerCase());

      await axios.post('http://localhost:3000/videos/convert', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      updateFileStatus(index, 'Completed');
    } catch (error) {
      console.error('Error during conversion:', error);
      updateFileStatus(index, 'Failed');
    }
  };

  const handleDownload = (file) => {
    const downloadUrl = `http://localhost:3000/videos/download/${file.id}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateFileStatus = (index, status) => {
    setVideoFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      updatedFiles[index].status = status;
      return updatedFiles;
    });
  };

  const updateFileProgress = (index, progress) => {
    setVideoFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      updatedFiles[index].progress = progress;
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

    if (videoToDelete && videoToDelete.id) {
      try {
        await axios.delete(`http://localhost:3000/videos/delete/${videoToDelete.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
            <Text color="orange.500">Uploading</Text>
            <Progress value={file.progress} colorScheme="orange" size="sm" width="100px" />
          </HStack>
        );
      case 'Processing':
        return <Tag size='lg' borderRadius='full' bg={"orange.500"} color={"white"} ><TagLabel>Processing</TagLabel></Tag>;
      case 'Completed':
        return <Tag size='lg' borderRadius='full' bg={"blue.500"} color={"white"} ><TagLabel>Completed</TagLabel></Tag>;
      case 'Failed':
        return <Tag size='lg' borderRadius='full' bg={"red.500"} color={"white"} ><TagLabel>Failed</TagLabel></Tag>;
      default:
        return <Tag size='lg' borderRadius='full' bg={"orange.500"} color={"white"}><TagLabel>Waiting</TagLabel></Tag>;
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
                  src={`http://localhost:3000/${file.thumbnailPath}`}
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
                      setVideoFiles(newFiles);
                    }}
                  >
                    <option value="MP4">MP4</option>
                    <option value="MKV">MKV</option>
                    <option value="WMV">WMV</option>
                    <option value="AVI">AVI</option>
                    <option value="MOV">MOV</option>
                    <option value="VOB">VOB</option>
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

      {videoFiles.length > 0 && (
        <Box display="flex" justifyContent="flex-end">
          {videoFiles.some(file => file.status === 'WAITING') && (
            <CustomButton
              mt={4} px={5}
              bg={'orange.400'} _hover={{ bg: "orange.500" }}
              _active={{ bg: "orange.500" }}
              leftIcon={FaExchangeAlt}
              onClick={() => {
                setConversionStarted(true);
                videoFiles.forEach((file, index) => {
                  if (file.status === 'WAITING') {
                    handleUpload(file, index);
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
