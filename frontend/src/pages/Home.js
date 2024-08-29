import React from 'react';
import { Box, Container, Text, VStack, HStack, Divider } from '@chakra-ui/react';
import UploadSection from '../components/UploadSection';
import WhyChooseUsSection from '../components/WhyChooseUsSection';

const Home = () => {
  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="container.lg" pt={10} pb={20}>
        <VStack spacing={6}>
          <UploadSection />

          <Divider borderBottomWidth={2} mt={5}></Divider>

          <Box textAlign="center" mt={5}>
            <Text fontSize="lg" fontWeight="bold">
              How to Convert Your Videos?
            </Text>
            <VStack justifyContent={"center"} alignItems={"flex-start"} mt={4}>
              <HStack>
                <Text bg="orange.400" color="white" px={3} py={1} borderRadius="md">1.</Text>
                <Text>Click the “Upload Files” button to upload your video.</Text>
              </HStack>
              <HStack>
                <Text bg="orange.400" color="white" px={3} py={1} borderRadius="md">2.</Text>
                <Text>After uploading, select the desired output format from the “Convert To” drop-down menu.</Text>
              </HStack>
              <HStack>
                <Text bg="orange.400" color="white" px={3} py={1} borderRadius="md">3.</Text>
                <Text>Click the blue “Convert” button to begin the conversion process.</Text>
              </HStack>
            </VStack>
          </Box>

          <Divider borderBottomWidth={2} mt={5}></Divider>

          {/* Why Choose Us */}
          <WhyChooseUsSection />
        </VStack >
      </Container >
    </Box >
  );
};

export default Home;
