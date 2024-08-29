import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, Button, VStack, HStack, useToast, Container, Image, Stack, IconButton, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay } from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { FaFileUpload, FaExchangeAlt, FaDownload, FaTrash } from 'react-icons/fa';
import CustomButton from '../components/CustomButton';
import axios from 'axios';

const formatDuration = (durationInSeconds) => {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const VideoPage = () => {
  const [videos, setVideos] = useState([]);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const cancelRef = React.useRef();
  const toast = useToast();

  const onDrop = useCallback((acceptedFiles) => {
    console.log(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('http://localhost:3000/videos', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setVideos(response.data);
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast({
          title: 'Error fetching videos.',
          description: 'Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchVideos();
  }, [toast]);

  const handleReformat = async (videoId) => {
    try {
      await axios.post(`http://localhost:3000/videos/reformat/${videoId}`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      toast({
        title: 'Video reformatted successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error reformatting video.',
        description: 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDownload = (videoId) => {
    window.location.href = `http://localhost:3000/videos/download/${videoId}`;
  };

  const handlePlayVideo = (videoId) => {
    setPlayingVideoId(videoId);
  };

  const openDeleteDialog = (videoId) => {
    setVideoToDelete(videoId);
    setIsDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteOpen(false);
    setVideoToDelete(null);
  };

  const handleDeleteVideo = async () => {
    try {
      await axios.delete(`http://localhost:3000/videos/delete/${videoToDelete}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setVideos(videos.filter(video => video._id !== videoToDelete));
      toast({
        title: 'Video deleted successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error deleting video.',
        description: 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      closeDeleteDialog();
    }
  };

  return (
    <Box bg="gray.50" minH="100vh" p={8}>
      <Container maxW="container.lg" pt={10} pb={20}>
        <Text textAlign={"center"} fontSize={{ base: "xl", md: "2xl" }} fontWeight={"bold"} mb={6}>
          Your Uploaded Videos:
        </Text>
        <VStack spacing={4}>
          {videos.length === 0 ? (
            <Box
              background={"gray.200"} rounded={10} px={'150px'} py={10}
              textAlign="center"
              borderWidth="4px"
              borderColor={isDragActive ? "purple.500" : "gray.300"}
              borderStyle={isDragActive ? "solid" : "dashed"}
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              <Text fontSize="lg" fontWeight="medium" mb={2}>
                You have no video upload records yet.
              </Text>
              <Button leftIcon={<FaFileUpload />} bg="#39349c"
                color="white"
                _hover={{ bg: "#151257" }}
                _active={{ bg: "#151257" }}
                boxShadow="xl" size="lg">
                Upload Files?
              </Button>
            </Box>
          ) : (
            <VStack spacing={4} width={{ base: "100%", md: "100%" }}>
              {videos.map((video) => (
                <Box key={video._id} p={4} shadow="md" borderWidth="1px" borderRadius="md" width="100%" background={'gray.100'} position="relative">
                  <IconButton
                    icon={<FaTrash />}
                    color={"red.400"}
                    position="absolute"
                    top="10px"
                    right="10px"
                    onClick={() => openDeleteDialog(video._id)}
                  />
                  <Stack
                    direction={playingVideoId === video._id ? 'column' : { base: 'column', md: 'row' }}
                    alignItems={playingVideoId === video._id ? 'space-between' : 'space-between'}
                    spacing={4}
                  >
                    {playingVideoId === video._id ? (
                      <video
                        src={video.videoUrl}
                        controls
                        autoPlay
                        style={{ borderRadius: 'md', width: '100%' }}
                      />
                    ) : (
                      <Image
                        src={video.thumbnailPath ? `http://localhost:3000/${video.thumbnailPath}` : video.thumbnail}
                        alt={video.originalName}
                        boxSize={{ base: "100%", md: "250px" }}
                        objectFit="cover"
                        borderRadius="md"
                        onClick={() => handlePlayVideo(video._id)}
                        cursor="pointer"
                      />
                    )}
                    <Stack direction={playingVideoId === video._id ? { base: 'column', md: 'row' } : 'column'} align={"flex-start"} justifyContent={"space-between"}>
                      <VStack align={"flex-start"}>
                        <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }}>{video.originalName}</Text>
                        <Text fontSize={{ base: "sm", md: "md" }}>Size: {Math.round(video.size / 1024 / 1024)} MB</Text>
                        <Text fontSize={{ base: "sm", md: "md" }}>Duration: {formatDuration(video.duration)}</Text>
                        <Text fontSize={{ base: "sm", md: "md" }}>File Type: {video.format}</Text>
                      </VStack>
                      <HStack spacing={4} pt={{ base: 2, md: 0 }} alignSelf={{ base: "center", md: "end" }}>
                        <CustomButton leftIcon={FaExchangeAlt} size="md" bg="blue.400" boxShadow={"lg"} onClick={() => handleReformat(video._id)}>
                          Reformat
                        </CustomButton>
                        <CustomButton leftIcon={FaDownload} size="md" onClick={() => handleDownload(video._id)}>
                          Download
                        </CustomButton>
                      </HStack>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={closeDeleteDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Video
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={closeDeleteDialog}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteVideo} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box >
  );
};

export default VideoPage;
