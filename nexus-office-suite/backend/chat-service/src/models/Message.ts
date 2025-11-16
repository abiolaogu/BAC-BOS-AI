import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { MessageType, Attachment, Reaction } from '../types';

export class Message extends Model {
  public id!: string;
  public channelId!: string;
  public userId!: string;
  public content!: string;
  public type!: MessageType;
  public threadId?: string;
  public parentId?: string;
  public replyCount!: number;
  public attachments!: Attachment[];
  public mentions!: string[];
  public reactions!: Reaction[];
  public isEdited!: boolean;
  public isDeleted!: boolean;
  public editedAt?: Date;
  public deletedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    channelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'channels',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(MessageType)),
      defaultValue: MessageType.TEXT,
      allowNull: false,
    },
    threadId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id',
      },
    },
    replyCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false,
    },
    mentions: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      allowNull: false,
    },
    reactions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false,
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['channelId'] },
      { fields: ['userId'] },
      { fields: ['threadId'] },
      { fields: ['parentId'] },
      { fields: ['createdAt'] },
      { fields: ['isDeleted'] },
      {
        name: 'messages_content_search',
        fields: ['content'],
        using: 'gin',
        operator: 'gin_trgm_ops',
      },
    ],
  }
);

export default Message;
