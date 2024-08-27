import React from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Input, FormControl, FormLabel } from '@chakra-ui/react';

const Register = ({ isOpen, onClose }) => {
  const handleSignup = () => {
    // Perform signup logic here, such as calling an API.
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Sign up</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>Email address</FormLabel>
            <Input type="email" />
          </FormControl>
          <FormControl mt={4}>
            <FormLabel>Username</FormLabel>
            <Input type="text" />
          </FormControl>
          <FormControl mt={4}>
            <FormLabel>Password</FormLabel>
            <Input type="password" />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="orange" mr={3} onClick={handleSignup}>
            Sign up
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Register;
