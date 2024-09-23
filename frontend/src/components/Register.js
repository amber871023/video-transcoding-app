import React, { useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Input, FormControl, FormLabel, FormErrorMessage, useToast } from '@chakra-ui/react';
import axios from 'axios';

const baseUrl = "http://localhost:3001";
//const baseUrl = "http://3.25.117.203:3001";
const Register = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`${baseUrl}/users/register`, { email, username, password });
      const { token } = response.data;
      localStorage.setItem('token', token);
      toast({
        title: 'Registration successful.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      // Clear input fields
      setEmail('');
      setUsername('');
      setPassword('');
      onSuccess();
    } catch (error) {
      setError('Failed to register.');
      toast({
        title: 'Registration failed.',
        description: error.response?.data?.msg || 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Sign up</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl isInvalid={!!error}>
            <FormLabel>Email address</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <FormLabel mt={4}>Username</FormLabel>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <FormLabel mt={4}>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {error && <FormErrorMessage>{error}</FormErrorMessage>}
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button
            bg="#39349c"
            color="white"
            _hover={{ bg: "#151257" }}
            _active={{ bg: "#151257" }}
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Sign up
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Register;

