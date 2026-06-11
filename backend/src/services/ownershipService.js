import mongoose from 'mongoose';
import Client from '../models/Client.js';
import Case from '../models/Case.js';
import Document from '../models/Document.js';
import Folder from '../models/Folder.js';
import logger from '../utils/logger.js';

/**
 * Validates that the Client exists and is owned by the specified User.
 * @param {string} clientId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function validateClientOwnership(clientId, userId) {
  if (!clientId || !userId) {return false;}
  if (!mongoose.Types.ObjectId.isValid(clientId)) {return false;}

  try {
    const client = await Client.findById(clientId).lean();
    if (!client) {return false;}
    return client.owner?.toString() === userId.toString();
  } catch (error) {
    logger.error({ err: error, clientId, userId }, 'Error in validateClientOwnership');
    return false;
  }
}

/**
 * Validates that the Case exists and is owned by the specified User.
 * @param {string} caseId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function validateCaseOwnership(caseId, userId) {
  if (!caseId || !userId) {return false;}
  if (!mongoose.Types.ObjectId.isValid(caseId)) {return false;}

  try {
    const caseDoc = await Case.findById(caseId).lean();
    if (!caseDoc) {return false;}
    return caseDoc.owner?.toString() === userId.toString();
  } catch (error) {
    logger.error({ err: error, caseId, userId }, 'Error in validateCaseOwnership');
    return false;
  }
}

/**
 * Validates that the Document exists and is owned by the specified User.
 * @param {string} documentId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function validateDocumentOwnership(documentId, userId) {
  if (!documentId || !userId) {return false;}
  if (!mongoose.Types.ObjectId.isValid(documentId)) {return false;}

  try {
    const document = await Document.findById(documentId).lean();
    if (!document) {return false;}
    return document.ownerId?.toString() === userId.toString();
  } catch (error) {
    logger.error({ err: error, documentId, userId }, 'Error in validateDocumentOwnership');
    return false;
  }
}

/**
 * Validates that the Folder exists and is owned by the specified User.
 * @param {string} folderId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function validateFolderOwnership(folderId, userId) {
  if (!folderId || !userId) {return false;}
  if (!mongoose.Types.ObjectId.isValid(folderId)) {return false;}

  try {
    const folder = await Folder.findById(folderId).lean();
    if (!folder) {return false;}
    return folder.ownerId?.toString() === userId.toString();
  } catch (error) {
    logger.error({ err: error, folderId, userId }, 'Error in validateFolderOwnership');
    return false;
  }
}

export default {
  validateClientOwnership,
  validateCaseOwnership,
  validateDocumentOwnership,
  validateFolderOwnership,
};
